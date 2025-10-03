'use client'

import { Text } from '@react-three/drei'
import {
  CuboidCollider,
  type IntersectionEnterHandler,
  type IntersectionExitHandler,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import { type ForwardedRef, forwardRef } from 'react'
import { Group, type Vector3Tuple } from 'three'

import { type Answer, type AnswerUserData, type TopicUserData } from '@/model/schema'

type AnswerTileProps = {
  answer: Answer | null
  position: Vector3Tuple
  userData: AnswerUserData | TopicUserData
}
// Basic sizing heuristics for collider based on text length.
const width = 2
const height = 2 // visual plate height

export const AnswerTile = forwardRef<RapierRigidBody, AnswerTileProps>(
  ({ answer, position, userData }, ref: ForwardedRef<RapierRigidBody>) => {
    const onIntersectionEnter: IntersectionEnterHandler = (e) => {}
    const onIntersectionExit: IntersectionExitHandler = (e) => {}

    console.warn('Rendering AnswerTile userData:', { answer, userData })

    return (
      <RigidBody
        ref={ref}
        type="dynamic"
        gravityScale={0}
        friction={0}
        mass={0}
        position={position}
        rotation={[-Math.PI / 2, 0, 0]}
        colliders={false}
        userData={userData}
        onIntersectionEnter={onIntersectionEnter}
        onIntersectionExit={onIntersectionExit}>
        <CuboidCollider args={[width / 2, height / 2, 2]} sensor={true} mass={0} friction={0} />
        {/* Visual background tile sits near ground */}
        <mesh>
          <planeGeometry args={[width, height]} />
          <meshStandardMaterial color="#222" />
        </mesh>
        {/* Text - lifted slightly above the tile */}
        <Text
          color="white"
          fontSize={0.26}
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          maxWidth={width - 0.2}
          position={[0, 0.0, 0.01]}
          rotation={[0, 0, 0]}>
          {answer?.text}
        </Text>
      </RigidBody>
    )
  },
)

AnswerTile.displayName = 'AnswerTile'

type QuestionTextProps = {
  text: string
  position?: Vector3Tuple
}

export const QuestionText = forwardRef<Group, QuestionTextProps>(
  ({ text, position = [0, 0.01, 0] }, ref) => {
    return (
      <group ref={ref} position={position}>
        <Text
          color="white"
          fontSize={0.26}
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          maxWidth={4}
          rotation={[-Math.PI / 2, 0, 0]}>
          {text}
        </Text>
      </group>
    )
  },
)

QuestionText.displayName = 'QuestionText'
