'use client'

import { Text } from '@react-three/drei'
import {
  CuboidCollider,
  type IntersectionEnterHandler,
  type IntersectionExitHandler,
  RigidBody,
} from '@react-three/rapier'
import { type FC } from 'react'
import { type Vector3Tuple } from 'three'

import { type Answer, type AnswerUserData } from '@/model/schema'

import { useGameStore } from './GameProvider'

type AnswerTileProps = {
  answer: Answer
  position: Vector3Tuple
}

export const AnswerTile: FC<AnswerTileProps> = ({ answer, position }) => {
  // Basic sizing heuristics for collider based on text length.
  const width = 2
  const height = 2 // visual plate height

  // TODO: if intersecting with player, highlight or something
  const onIntersectionEnter: IntersectionEnterHandler = (e) => {
    console.log('Intersected answer:', e)
  }
  const onIntersectionExit: IntersectionExitHandler = (e) => {
    console.log('Exited answer:', e)
  }

  const userData: AnswerUserData = { type: 'answer', answer }

  return (
    <group>
      <RigidBody
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
      </RigidBody>

      {/* Text - lifted slightly above the tile */}
      <Text
        color="white"
        fontSize={0.26}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={width - 0.2}
        position={[position[0], position[1] + 0.01, position[2]]}
        rotation={[-Math.PI / 2, 0, 0]}>
        {answer.text}
      </Text>
    </group>
  )
}

type AnswersProps = Record<string, never>

const Question: FC<AnswersProps> = () => {
  const currentQuestionId = useGameStore((s) => s.nextQuestionId)
  const currentQuestion = useGameStore((s) =>
    s.questions.find((q) => q.id === currentQuestionId),
  )

  if (!currentQuestion) return null

  const { id, text, answers } = currentQuestion

  const answerTileProps = answers.map((answer, index) => ({
    answer,
    position: [index % 2 === 0 ? -3 : 3, 0.001, 3] as [number, number, number],
  }))

  return (
    <group>
      {/* Question Text */}
      <Text
        color="white"
        fontSize={0.26}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={4}
        position={[0, 0 + 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}>
        {text}
      </Text>
      {/* Answer tiles */}
      {answerTileProps.map((props) => (
        <AnswerTile key={props.answer.text} {...props} />
      ))}
    </group>
  )
}

export default Question
