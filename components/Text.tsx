'use client'

import { useThree } from '@react-three/fiber'
import { FC, type RefObject } from 'react'
import { Group, type Vector3Tuple } from 'three'

import { type TextCanvasOptions, useTextCanvas } from '@/hooks/useTextCanvas'

type Props = {
  ref?: RefObject<Group | null>
  text: string
  position: Vector3Tuple
  width: number
  height: number
  textCanvasOptions?: Partial<TextCanvasOptions>
}

export const Text: FC<Props> = ({
  text,
  position,
  width,
  height,
  textCanvasOptions = {},
  ref,
}) => {
  const dpr = useThree((s) => s.viewport.dpr)

  const canvasState = useTextCanvas(text, {
    width: width * 80 * dpr,
    height: height * 80 * dpr,
    color: '#0f0d0f',
    baseFontScale: 0.2,
    ...textCanvasOptions,
  })

  return (
    <group ref={ref} position={position}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={canvasState?.texture ?? null}
          transparent={true}
          depthTest={true}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}
