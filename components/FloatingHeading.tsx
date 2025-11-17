'use client'

import { useThree } from '@react-three/fiber'
import { FC, type RefObject, Suspense, useEffect, useMemo } from 'react'
import { BackSide, Mesh, type Vector3Tuple } from 'three'

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
    fontSize: 120 * dpr,
    fontWeight: 700,
  })

  const { radius, thetaLength, thetaStart } = useMemo(() => {
    const arcLength = Math.PI * 0.8 // keeps a gentle bend without wrapping the texture
    const computedRadius = Math.max(width / arcLength, 0.001)
    const start = Math.PI / 2 - arcLength / 2

    return {
      radius: computedRadius,
      thetaLength: arcLength,
      thetaStart: start,
    }
  }, [width])

  useEffect(() => {
    if (!canvasState?.texture) return

    const { texture } = canvasState
    texture.repeat.set(-1, texture.repeat.y)
    texture.offset.set(1, texture.offset.y)
    texture.needsUpdate = true
  }, [canvasState])

  return (
    <Suspense fallback={null}>
      <mesh ref={ref} position={position} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry
          args={[radius, radius, height, 64, 1, true, thetaStart, thetaLength]}
        />
        <meshBasicMaterial
          map={canvasState?.texture ?? TRANSPARENT_TEXTURE}
          transparent={true}
          depthTest={false}
          depthWrite={false}
          toneMapped={false}
          side={BackSide}
        />
      </mesh>
    </Suspense>
  )
}
