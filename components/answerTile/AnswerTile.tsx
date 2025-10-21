'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import { forwardRef, useMemo, useRef } from 'react'
import { CanvasTexture, type Vector3Tuple } from 'three'

import Particles from '@/components/answerTile/particles/Particles'
import { useGameStore } from '@/components/GameProvider'
import { getPaletteHex } from '@/components/palette'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { ANSWER_TILE_HEIGHT, ANSWER_TILE_WIDTH } from '@/components/terrain/terrainBuilder'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'
import { useTextCanvas } from '@/hooks/useTextCanvas'
import { type AnswerUserData } from '@/model/schema'

import answerTileFragment from './answerTile.frag'
import answerTileVertex from './answerTile.vert'

const ANSWER_TILE_ASPECT = ANSWER_TILE_WIDTH / ANSWER_TILE_HEIGHT
const CANVAS_WIDTH = ANSWER_TILE_WIDTH * 128
const CANVAS_HEIGHT = ANSWER_TILE_HEIGHT * 128

type AnswerTileShaderUniforms = {
  uConfirmingProgress: number
  uIsConfirming: number
  uTileAspect: number
  uTime: number
  uTextTexture: CanvasTexture | null
}

const INITIAL_ANSWER_TILE_UNIFORMS: AnswerTileShaderUniforms = {
  uConfirmingProgress: 0,
  uIsConfirming: 0,
  uTileAspect: ANSWER_TILE_ASPECT,
  uTime: 0,
  uTextTexture: null,
}

const AnswerTileShader = shaderMaterial(
  INITIAL_ANSWER_TILE_UNIFORMS,
  answerTileVertex,
  answerTileFragment,
)
const AnswerTileShaderMaterial = extend(AnswerTileShader)

type AnswerTileProps = {
  position: Vector3Tuple
  index: number
}

const labelColour = getPaletteHex(0.5)

export const AnswerTile = forwardRef<RapierRigidBody, AnswerTileProps>(
  ({ position, index }, ref) => {
    const currentQuestion = useGameStore((s) => s.currentQuestion)
    const confirmingAnswer = useGameStore((s) => s.confirmingAnswer)
    const confirmedAnswers = useGameStore((s) => s.confirmedAnswers)

    const shader = useRef<typeof AnswerTileShaderMaterial & AnswerTileShaderUniforms>(null)
    const localProgress = useRef(0)
    const { confirmationProgress } = useConfirmationProgress()

    const isConfirmingThisAnswer = useMemo<boolean>(() => {
      if (!confirmingAnswer) return false
      if (!currentQuestion.answers[index]) return false
      return confirmingAnswer.answerNumber === index + 1
    }, [confirmingAnswer, currentQuestion, index])

    // Compute text + userData first; used by the text canvas hook
    const { text, userData } = useMemo<{
      text: string
      userData: AnswerUserData | undefined
    }>(() => {
      const answer = currentQuestion?.answers[index]
      if (!answer) return { text: '', userData: undefined }
      const userData: AnswerUserData = {
        type: 'answer',
        answer,
        questionId: currentQuestion.id,
        answerNumber: index + 1, // 1-based index for sync with row data.
      }
      return { text: answer.text, userData }
    }, [currentQuestion, index])

    const { wasConfirmed, wasCorrect } = useMemo(() => {
      const confirmedEntry = confirmedAnswers.find((a) => a.answer.text === text)
      const wasConfirmed = Boolean(confirmedEntry)
      const wasCorrect = Boolean(confirmedEntry?.answer.isCorrect)
      return { wasConfirmed, wasCorrect }
    }, [confirmedAnswers, text])

    useFrame(({ clock }) => {
      if (!shader.current) return

      const globalProgress = confirmationProgress.current

      if (isConfirmingThisAnswer) {
        // If confirming this answer, track the global progress upward
        localProgress.current = Math.max(localProgress.current, globalProgress)
      } else {
        // Not confirming: only allow progress to decrease, following global progress
        localProgress.current = Math.min(localProgress.current, globalProgress)
      }

      shader.current.uConfirmingProgress = localProgress.current
      shader.current.uIsConfirming = isConfirmingThisAnswer ? 1 : 0
      shader.current.uTime = clock.elapsedTime
    })

    const canvasState = useTextCanvas(text, {
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      color: labelColour,
      fontWeight: 400,
      baseFontScale: 0.1,
    })

    return (
      <RigidBody
        ref={ref}
        // KEEP DYNAMIC
        type="dynamic"
        gravityScale={0}
        friction={0}
        mass={0}
        position={position}
        rotation={[-Math.PI / 2, 0, 0]}
        colliders={false}
        userData={userData}>
        <CuboidCollider
          args={[ANSWER_TILE_WIDTH / 2, ANSWER_TILE_HEIGHT / 2, PLAYER_RADIUS * 2]}
          sensor={true}
          mass={0}
          friction={0}
        />
        {/* Single mesh: shader renders border + samples text texture */}
        <mesh position={[0, 0, 0.03]}>
          <planeGeometry args={[ANSWER_TILE_WIDTH, ANSWER_TILE_HEIGHT]} />
          <AnswerTileShaderMaterial
            key={AnswerTileShader.key}
            ref={shader}
            transparent={true}
            // Respect scene depth so the player can occlude the tile as expected
            depthTest={true}
            // Do not write depth so the semi-transparent edges don't occlude later draws
            depthWrite={false}
            // Mild offset to avoid coplanar artifacts with terrain
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
            uConfirmingProgress={0}
            uIsConfirming={0}
            uTextTexture={canvasState?.texture ?? null}
          />
        </mesh>
        {/* Confetti burst when this answer is confirmed */}
        <Particles
          width={ANSWER_TILE_WIDTH}
          height={ANSWER_TILE_HEIGHT}
          wasConfirmed={wasConfirmed}
          wasCorrect={wasCorrect}
        />
      </RigidBody>
    )
  },
)

AnswerTile.displayName = 'AnswerTile'
