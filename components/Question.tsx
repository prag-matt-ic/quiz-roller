'use client'

import { Text } from '@react-three/drei'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import { forwardRef, useMemo } from 'react'
import { Group, type Vector3Tuple } from 'three'

import { type AnswerUserData } from '@/model/schema'

import { useGameStore } from './GameProvider'
import { PLAYER_RADIUS } from './player/PlayerHUD'
import {
  ANSWER_TILE_HEIGHT,
  ANSWER_TILE_WIDTH,
  QUESTION_TEXT_MAX_WIDTH,
  QUESTION_TEXT_ROWS,
} from './terrain/terrainBuilder'

type AnswerTileProps = {
  position: Vector3Tuple
  index: number
}

export const AnswerTile = forwardRef<RapierRigidBody, AnswerTileProps>(
  ({ position, index }, ref) => {
    const currentQuestion = useGameStore((s) => s.questions[s.currentQuestionIndex])

    const answer = currentQuestion.answers[index]

    const userData = useMemo<AnswerUserData | undefined>(() => {
      if (!answer) return undefined
      return {
        type: 'answer',
        answer,
        questionId: currentQuestion.id,
      }
    }, [answer, currentQuestion.id])

    const text = answer?.text ?? ''

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
          <meshStandardMaterial color="#fff" transparent={true} opacity={0.7} />
        </mesh>
        <Text
          color="#000"
          fontSize={0.35}
          anchorX="center"
          anchorY="middle"
          textAlign="center"
          maxWidth={ANSWER_TILE_WIDTH - 0.2}
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
