'use client'

import { useThree } from '@react-three/fiber'
import { FC, type RefObject, Suspense } from 'react'
import { Mesh, type Vector3Tuple } from 'three'

import {
  TEXT_CANVAS_SCALE,
  type TextCanvasOptions,
  TRANSPARENT_TEXTURE,
  useTextCanvas,
} from '@/hooks/useTextCanvas'
import { getPaletteHex } from './palette'

type Props = {
  ref?: RefObject<Mesh | null>
  text: string
  position: Vector3Tuple
  width: number
  height: number
  textCanvasOptions?: Partial<TextCanvasOptions>
}

const textColour = getPaletteHex(0.6)

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
    width: width * dpr * TEXT_CANVAS_SCALE,
    height: height * dpr * TEXT_CANVAS_SCALE,
    color: textColour,
    ...textCanvasOptions,
    fontSize: 18 * dpr,
  })

  return (
    <Suspense fallback={null}>
      <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={canvasState?.texture ?? TRANSPARENT_TEXTURE}
          transparent={true}
          depthTest={true}
          depthWrite={false}
        />
      </mesh>
    </Suspense>
  )
}
