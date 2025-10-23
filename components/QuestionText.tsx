'use client'

import { forwardRef } from 'react'
import { Group, type Vector3Tuple } from 'three'

import { useTextCanvas } from '@/hooks/useTextCanvas'

import { QUESTION_TEXT_HEIGHT, QUESTION_TEXT_WIDTH } from '../utils/terrainBuilder'

type Props = {
  text: string
  position: Vector3Tuple
}

// Compute canvas resolution for crisp text (texel density ~128px per world unit)
const CANVAS_WIDTH = QUESTION_TEXT_WIDTH * 128
const CANVAS_HEIGHT = QUESTION_TEXT_HEIGHT * 128

export const QuestionText = forwardRef<Group, Props>(({ text, position }, ref) => {
  const canvasState = useTextCanvas(text, {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    color: '#000000',
    baseFontScale: 0.1,
  })

  return (
    <group ref={ref} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[QUESTION_TEXT_WIDTH, QUESTION_TEXT_HEIGHT]} />
        <meshBasicMaterial
          map={canvasState?.texture ?? null}
          transparent={true}
          depthTest={true}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
})

QuestionText.displayName = 'QuestionText'
