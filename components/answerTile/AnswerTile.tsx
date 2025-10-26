'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import { type FC, type RefObject, useMemo, useRef } from 'react'
import { Texture, type Vector3Tuple } from 'three'

import Particles from '@/components/answerTile/particles/Particles'
import { useGameStore } from '@/components/GameProvider'
import { getPaletteHex } from '@/components/palette'
import { PLAYER_RADIUS } from '@/components/player/ConfirmationBar'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'
import { TRANSPARENT_TEXTURE, useTextCanvas } from '@/hooks/useTextCanvas'
import { type AnswerUserData, type TopicUserData } from '@/model/schema'
import { ANSWER_TILE_HEIGHT, ANSWER_TILE_WIDTH } from '@/utils/tiles'

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
  uTextTexture: Texture | null
  uPlayerColourIndex: number
}

const INITIAL_ANSWER_TILE_UNIFORMS: AnswerTileShaderUniforms = {
  uConfirmingProgress: 0,
  uIsConfirming: 0,
  uTileAspect: ANSWER_TILE_ASPECT,
  uTime: 0,
  uTextTexture: null,
  uPlayerColourIndex: 1,
}

const AnswerTileShader = shaderMaterial(
  INITIAL_ANSWER_TILE_UNIFORMS,
  answerTileVertex,
  answerTileFragment,
)
const AnswerTileShaderMaterial = extend(AnswerTileShader)

type BaseProps = {
  ref?: RefObject<RapierRigidBody | null>
  position: Vector3Tuple
}

export type AnswerTileProps = BaseProps & {
  text: string
  userData: AnswerUserData | TopicUserData | undefined
  isConfirming: boolean
  wasConfirmed: boolean
  wasCorrect: boolean
}

const labelColour = getPaletteHex(0.5)

// Generic answer tile component which can be used for the Topic question
export const AnswerTile: FC<AnswerTileProps> = ({
  ref,
  position,
  isConfirming,
  text,
  userData,
  wasConfirmed,
  wasCorrect,
}) => {
  const playerColourIndex = useGameStore((s) => s.playerColourIndex)
  const shader = useRef<typeof AnswerTileShaderMaterial & AnswerTileShaderUniforms>(null)
  const localProgress = useRef(0)
  const { confirmationProgress } = useConfirmationProgress()

  useFrame(({ clock }) => {
    if (!shader.current) return
    const globalProgress = confirmationProgress.current

    if (isConfirming) {
      // If confirming this answer, track the global progress upward
      localProgress.current = Math.max(localProgress.current, globalProgress)
    } else {
      // Not confirming: only allow progress to decrease, following global progress
      localProgress.current = Math.min(localProgress.current, globalProgress)
    }

    shader.current.uConfirmingProgress = localProgress.current
    shader.current.uIsConfirming = isConfirming ? 1 : 0
    shader.current.uTime = clock.elapsedTime
  })

  const canvasState = useTextCanvas(text, {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    color: labelColour,
    fontWeight: 400,
    fontSize: 48,
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
          depthTest={true}
          depthWrite={false}
          uConfirmingProgress={0}
          uIsConfirming={0}
          uTextTexture={canvasState?.texture ?? TRANSPARENT_TEXTURE}
          uPlayerColourIndex={playerColourIndex}
          polygonOffset={true}
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      {/* Particles burst when this answer is confirmed */}
      <Particles
        width={ANSWER_TILE_WIDTH}
        height={ANSWER_TILE_HEIGHT}
        wasConfirmed={wasConfirmed}
        wasCorrect={wasCorrect}
      />
    </RigidBody>
  )
}

type QuestionAnswerTileProps = BaseProps & {
  index: number
}

// Answer tile for the current question's answer at the given index
export const QuestionAnswerTile: FC<QuestionAnswerTileProps> = ({ index, ...rest }) => {
  const currentQuestion = useGameStore((s) => s.currentQuestion)
  const confirmingAnswer = useGameStore((s) => s.confirmingAnswer)
  const confirmedAnswers = useGameStore((s) => s.confirmedAnswers)

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

  const isConfirmingThisAnswer = useMemo<boolean>(() => {
    if (!confirmingAnswer || !currentQuestion) return false
    if (!currentQuestion.answers[index]) return false
    return confirmingAnswer.answerNumber === index + 1
  }, [confirmingAnswer, currentQuestion, index])

  const { wasConfirmed, wasCorrect } = useMemo(() => {
    const confirmedEntry = confirmedAnswers.find((a) => a.answer.text === text)
    const wasConfirmed = Boolean(confirmedEntry)
    const wasCorrect = Boolean(confirmedEntry?.answer.isCorrect)
    return { wasConfirmed, wasCorrect }
  }, [confirmedAnswers, text])

  return (
    <AnswerTile
      {...rest}
      isConfirming={isConfirmingThisAnswer}
      wasConfirmed={wasConfirmed}
      wasCorrect={wasCorrect}
      text={text}
      userData={userData}
    />
  )
}
