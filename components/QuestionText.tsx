'use client'

import { Text } from '@react-three/drei'
import { forwardRef } from 'react'
import { Group, type Vector3Tuple } from 'three'

type Props = {
  text: string
  position?: Vector3Tuple
  maxWidth?: number
  fontSize?: number
}

export const QuestionText = forwardRef<Group, Props>(
  ({ text, position = [0, 0.01, 0], maxWidth = 4, fontSize = 0.26 }, ref) => {
    return (
      <group ref={ref} position={position}>
        {/* <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
          <planeGeometry args={[QUESTION_TEXT_MAX_WIDTH, QUESTION_TEXT_ROWS]} />
          <meshStandardMaterial color="#fff" transparent={true} opacity={0.1} />
        </mesh> */}
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
