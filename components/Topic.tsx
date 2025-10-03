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

import { type TopicUserData } from '@/model/schema'

import { useGameStore } from './GameProvider'

type TopicTileProps = {
  topic: string
  position: Vector3Tuple
}

export const TopicTile: FC<TopicTileProps> = ({ topic, position }) => {
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

  const userData: TopicUserData = { type: 'topic', topic }

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
        {topic}
      </Text>
    </group>
  )
}

type AnswersProps = Record<string, never>

const TOPICS: TopicTileProps[] = [
  {
    topic: 'UX/UI Design',
    position: [-3, 0.001, -3] as [number, number, number],
  },
  {
    topic: 'Psychology',
    position: [3, 0.001, -3] as [number, number, number],
  },
  {
    topic: 'English',
    position: [-3, 0.001, 3] as [number, number, number],
  },
  {
    topic: 'Artificial Intelligence',
    position: [3, 0.001, 3] as [number, number, number],
  },
]

const Topics: FC<AnswersProps> = () => {
  const topic = useGameStore((s) => s.topic)

  if (!!topic) return null
  return (
    <group>
      {TOPICS.map(({ topic, position }) => (
        <TopicTile key={topic} topic={topic} position={position} />
      ))}
    </group>
  )
}

export default Topics
