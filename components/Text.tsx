'use client'

import { useThree } from '@react-three/fiber'
import { FC, type RefObject, Suspense } from 'react'
import { Mesh, type Vector3Tuple } from 'three'

import {
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
    color: '#0f0d0f', // TODO: get colour from palette
    ...textCanvasOptions,
    fontSize: textCanvasOptions?.fontSize ?? 28 * dpr,
  })

  return (
    <Suspense fallback={null}>
      <mesh ref={ref} position={position} rotation={[-Math.PI / 2, 0, 0]}>
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
