'use client'

import { shaderMaterial, Text } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import gsap from 'gsap'
import { forwardRef, useEffect, useMemo, useRef } from 'react'
import { type Vector3Tuple } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { CONFIRMATION_DURATION_S, PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { ANSWER_TILE_HEIGHT, ANSWER_TILE_WIDTH } from '@/components/terrain/terrainBuilder'
import { type AnswerUserData } from '@/model/schema'

import answerTileFragment from './answerTile.frag'
import answerTileVertex from './answerTile.vert'

const ANSWER_TILE_ASPECT = ANSWER_TILE_WIDTH / ANSWER_TILE_HEIGHT

type AnswerTileShaderUniforms = {
  uConfirmingProgress: number
  uTileAspect: number
  uTime: number
}

const INITIAL_ANSWER_TILE_UNIFORMS: AnswerTileShaderUniforms = {
  uConfirmingProgress: 0,
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

    const isConfirming: boolean = useMemo(() => {
      if (!confirmingAnswer) return false
      if (!currentQuestion.answers[index]) return false
      return confirmingAnswer.answer.text === currentQuestion.answers[index].text
    }, [confirmingAnswer, currentQuestion, index])

    const { text, userData }: { text: string; userData: AnswerUserData | undefined } =
      useMemo(() => {
        const answer = currentQuestion?.answers[index]
        if (!answer) return { text: '', userData: undefined }
        const userData: AnswerUserData = {
          type: 'answer',
          answer,
          questionId: currentQuestion.id,
        }
        const text = answer.text
        return { text, userData }
      }, [currentQuestion, index])

    const wasConfirmed: boolean = useMemo(
      () => confirmedAnswers.some((a) => a.answer.text === text),
      [confirmedAnswers, text],
    )

    console.log('Answer Tile', { text, isConfirming, wasConfirmed })

    const shader = useRef<typeof AnswerTileShaderMaterial & AnswerTileShaderUniforms>(null)
    const confirmingProgress = useRef({ value: 0 })
    const confirmingProgressTween = useRef<GSAPTween | null>(null)

    useEffect(() => {
      confirmingProgressTween.current?.kill()
      confirmingProgressTween.current = gsap.to(confirmingProgress.current, {
        value: isConfirming ? 1 : 0,
        duration: isConfirming ? CONFIRMATION_DURATION_S : 0.4,
        ease: 'power2.out',
      })
    }, [isConfirming])

    useFrame(({ clock }) => {
      if (!shader.current) return
      shader.current.uConfirmingProgress = confirmingProgress.current.value
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
        <mesh>
          <planeGeometry args={[ANSWER_TILE_WIDTH, ANSWER_TILE_HEIGHT]} />
          <AnswerTileShaderMaterial
            key={AnswerTileShader.key}
            ref={shader}
            transparent={true}
            depthWrite={true}
            uConfirmingProgress={0}
          />
        </mesh>
        <Text
          color="#000"
          fontSize={0.35}
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          maxWidth={ANSWER_TILE_WIDTH - 0.5}
          position={[0, 0.0, 0.01]}
          rotation={[0, 0, 0]}>
          {text}
        </Text>
      </RigidBody>
    )
  },
)

AnswerTile.displayName = 'AnswerTile'
