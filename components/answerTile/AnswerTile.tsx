'use client'

import { shaderMaterial, Text } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import { forwardRef, useMemo, useRef } from 'react'
import { type Vector3Tuple } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { ANSWER_TILE_HEIGHT, ANSWER_TILE_WIDTH } from '@/components/terrain/terrainBuilder'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'
import { type AnswerUserData } from '@/model/schema'

import answerTileFragment from './answerTile.frag'
import answerTileVertex from './answerTile.vert'

const ANSWER_TILE_ASPECT = ANSWER_TILE_WIDTH / ANSWER_TILE_HEIGHT

type AnswerTileShaderUniforms = {
  uConfirmingProgress: number
  uIsConfirming: number
  uTileAspect: number
  uTime: number
}

const INITIAL_ANSWER_TILE_UNIFORMS: AnswerTileShaderUniforms = {
  uConfirmingProgress: 0,
  uIsConfirming: 0,
  uTileAspect: ANSWER_TILE_ASPECT,
  uTime: 0,
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

export const AnswerTile = forwardRef<RapierRigidBody, AnswerTileProps>(
  ({ position, index }, ref) => {
    const currentQuestion = useGameStore((s) => s.currentQuestion)
    const confirmingAnswer = useGameStore((s) => s.confirmingAnswer)
    const confirmedAnswers = useGameStore((s) => s.confirmedAnswers)

    const isConfirmingThisAnswer: boolean = useMemo(() => {
      if (!confirmingAnswer) return false
      if (!currentQuestion.answers[index]) return false
      return confirmingAnswer.answerNumber === index + 1
    }, [confirmingAnswer, currentQuestion, index])

    const { text, userData }: { text: string; userData: AnswerUserData | undefined } =
      useMemo(() => {
        const answer = currentQuestion?.answers[index]
        if (!answer) return { text: '', userData: undefined }
        const userData: AnswerUserData = {
          type: 'answer',
          answer,
          questionId: currentQuestion.id,
          answerNumber: index + 1, // 1-based index for sync with row data.
        }
        const text = answer.text
        return { text, userData }
      }, [currentQuestion, index])

    // TODO: Use wasConfirmed for visual feedback (correct/incorrect animation)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const wasConfirmed: boolean = useMemo(
      () => confirmedAnswers.some((a) => a.answer.text === text),
      [confirmedAnswers, text],
    )

    const shader = useRef<typeof AnswerTileShaderMaterial & AnswerTileShaderUniforms>(null)
    const localProgress = useRef(0)

    // Subscribe to confirmation progress from GameProvider
    const { confirmationProgress } = useConfirmationProgress()

    useFrame(({ clock }) => {
      if (!shader.current) return

      const globalProgress = confirmationProgress.current

      // If confirming this answer, track the global progress upward
      if (isConfirmingThisAnswer) {
        localProgress.current = Math.max(localProgress.current, globalProgress)
      } else {
        // Not confirming: only allow progress to decrease, following global progress
        localProgress.current = Math.min(localProgress.current, globalProgress)
      }

      shader.current.uConfirmingProgress = localProgress.current
      shader.current.uIsConfirming = isConfirmingThisAnswer ? 1 : 0
      shader.current.uTime = clock.elapsedTime
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
        {/* Slightly elevate the visual mesh above the terrain to avoid z-fighting */}
        <mesh position={[0, 0, 0.02]} renderOrder={10}>
          <planeGeometry args={[ANSWER_TILE_WIDTH, ANSWER_TILE_HEIGHT]} />
          <AnswerTileShaderMaterial
            key={AnswerTileShader.key}
            ref={shader}
            transparent={true}
            depthWrite={true}
            polygonOffset={true}
            polygonOffsetFactor={-1}
            polygonOffsetUnits={-1}
            uConfirmingProgress={0}
            uIsConfirming={0}
          />
        </mesh>
        {/* Lift text slightly above the tile surface to prevent z-fighting with the plane */}
        <Text
          color="#000"
          fontSize={0.35}
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          maxWidth={ANSWER_TILE_WIDTH - 0.5}
          position={[0, 0.0, 0.03]}
          rotation={[0, 0, 0]}>
          {text}
        </Text>
      </RigidBody>
    )
  },
)

AnswerTile.displayName = 'AnswerTile'

// TODO: Add a "waiting for next question" if reached and not ready
// TODO: Add a correct/incorrect feedback. Correct should be like confetti.
// TODO: sound effects should be triggered from the GameProvider when answer is confirmed
