'use client'

import { Text } from '@react-three/drei'
import { forwardRef } from 'react'
import { Group, type Vector3Tuple } from 'three'

import { QUESTION_TEXT_FONT_SIZE, QUESTION_TEXT_MAX_WIDTH } from './terrain/terrainBuilder'

type Props = {
  text: string
  position: Vector3Tuple
}

export const QuestionText = forwardRef<Group, Props>(({ text, position }, ref) => {
  return (
    <group ref={ref} position={position}>
      <Text
        color="#000"
        fontSize={QUESTION_TEXT_FONT_SIZE}
        anchorX="center"
        anchorY="middle"
        textAlign="center"
        maxWidth={QUESTION_TEXT_MAX_WIDTH}
        rotation={[-Math.PI / 2, 0, 0]}>
        {text}
      </Text>
    </group>
  )
})

QuestionText.displayName = 'QuestionText'
