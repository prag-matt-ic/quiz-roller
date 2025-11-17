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

type Props = {
  ref?: RefObject<Mesh | null>
  text: string
  position: Vector3Tuple
  width: number
  height: number
  textCanvasOptions?: Partial<TextCanvasOptions>
}

export const FloatingHeading: FC<Props> = ({
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
    color: '#ffffff',
    ...textCanvasOptions,
    lineHeightMultiplier: 1.2,
    fontSize: 64 * dpr,
    fontWeight: 700,
  })

  return (
    <Suspense fallback={null}>
      <mesh ref={ref} position={position}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial
          map={canvasState?.texture ?? TRANSPARENT_TEXTURE}
          transparent={true}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
    </Suspense>
  )
}
