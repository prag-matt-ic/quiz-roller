'use client'

import { Text } from '@react-three/drei'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import { forwardRef } from 'react'
import { Group, type Vector3Tuple } from 'three'

import { type AnswerUserData, type TopicUserData } from '@/model/schema'
import { QUESTION_TEXT_MAX_WIDTH, QUESTION_TEXT_ROWS } from './terrain/terrainBuilder'
import { PLAYER_RADIUS } from './player/PlayerHUD'

type AnswerTileProps = {
  text: string | null
  position: Vector3Tuple
  userData?: AnswerUserData | TopicUserData
  tileWidth?: number
  tileHeight?: number
}
const DEFAULT_TILE_WIDTH = 2
const DEFAULT_TILE_HEIGHT = 2

export const AnswerTile = forwardRef<RapierRigidBody, AnswerTileProps>(
  (
    {
      text,
      position,
      userData,
      tileWidth = DEFAULT_TILE_WIDTH,
      tileHeight = DEFAULT_TILE_HEIGHT,
    },
    ref,
  ) => {
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
          args={[tileWidth / 2, tileHeight / 2, PLAYER_RADIUS * 2]}
          sensor={true}
          mass={0}
          friction={0}
        />
        <mesh>
          <planeGeometry args={[tileWidth, tileHeight]} />
          <meshStandardMaterial color="#fff" transparent={true} opacity={0.7} />
        </mesh>
        <Text
          color="#000"
          fontSize={0.35}
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          maxWidth={tileWidth - 0.2}
          position={[0, 0.0, 0.01]}
          rotation={[0, 0, 0]}>
          {text}
        </Text>
      </RigidBody>
    )
  },
)

AnswerTile.displayName = 'AnswerTile'

type QuestionTextProps = {
  text: string
  position?: Vector3Tuple
  maxWidth?: number
  fontSize?: number
}

export const QuestionText = forwardRef<Group, QuestionTextProps>(
  ({ text, position = [0, 0.01, 0], maxWidth = 4, fontSize = 0.26 }, ref) => {
    return (
      <group ref={ref} position={position}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[QUESTION_TEXT_MAX_WIDTH, QUESTION_TEXT_ROWS]} />
          <meshStandardMaterial color="#fff" transparent={true} opacity={0.1} />
        </mesh>
        <Text
          color="#000"
          fontSize={fontSize}
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          maxWidth={maxWidth}
          rotation={[-Math.PI / 2, 0, 0]}>
          {text}
        </Text>
      </group>
    )
  },
)

QuestionText.displayName = 'QuestionText'

// export const AnswerTileCollider = forwardRef<RapierCollider, AnswerTileProps>(
//   ({ text, position, userData }, ref: ForwardedRef<RapierCollider>) => {
//     console.warn('Rendering AnswerTile userData:', { text, userData })

//     return (
//       // Not attached to a rigid body, so static by default
//       <CuboidCollider
//         ref={ref}
//         args={[width / 2, height / 2, 2]}
//         sensor={true}
//         position={position}
//         mass={0}
//         friction={0}>
//         {/* Visual background tile sits near ground */}
//         <mesh>
//           <planeGeometry args={[width, height]} />
//           <meshStandardMaterial color="#222" transparent={true} opacity={!!text ? 1 : 0} />
//         </mesh>
//         {/* Text - lifted slightly above the tile */}
//         <Text
//           color="white"
//           fontSize={0.26}
//           anchorX="center"
//           anchorY="middle"
//           textAlign="center"
//           maxWidth={width - 0.2}
//           position={[0, 0.0, 0.01]}
//           rotation={[0, 0, 0]}>
//           {text}
//         </Text>
//       </CuboidCollider>
//     )
//   },
// )

// AnswerTileCollider.displayName = 'AnswerTileCollider'
