'use client'

import { shaderMaterial, Text } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import { forwardRef, useMemo, useRef } from 'react'
import { type Vector3Tuple } from 'three'

import { useGameStore } from '@/components/GameProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { ANSWER_TILE_HEIGHT, ANSWER_TILE_WIDTH } from '@/components/terrain/terrainBuilder'
import { type AnswerUserData } from '@/model/schema'

import answerTileFragment from './answerTile.frag'
import answerTileVertex from './answerTile.vert'

type AnswerTileShaderUniforms = {
  uTime: number
}

const INITIAL_ANSWER_TILE_UNIFORMS: AnswerTileShaderUniforms = {
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
    const currentQuestion = useGameStore((s) => s.questions[s.currentQuestionIndex])
    const isBeingConfirmed = useGameStore(
      (s) => s.confirmingAnswer?.answer.text === currentQuestion.answers[index]?.text,
    )

    console.warn('Rendering AnswerTile:', { position, index, isBeingConfirmed })

    const answerTileShaderRef = useRef<
      typeof AnswerTileShaderMaterial & AnswerTileShaderUniforms
    >(null)

    const { text, userData } = useMemo(() => {
      const answer = currentQuestion.answers[index]

      const userData: AnswerUserData | undefined = !!answer
        ? {
            type: 'answer',
            answer,
            questionId: currentQuestion.id,
          }
        : undefined

      const text = answer?.text ?? ''

      return { text, userData }
    }, [currentQuestion, index])

    useFrame(({ clock }) => {
      if (!answerTileShaderRef.current) return
      if (isBeingConfirmed) {
        // Drive pulsation via elapsed time only while confirming
        answerTileShaderRef.current.uTime = clock.elapsedTime
      }
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
            ref={answerTileShaderRef}
            uTime={INITIAL_ANSWER_TILE_UNIFORMS.uTime}
            transparent={true}
            depthWrite={true}
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
