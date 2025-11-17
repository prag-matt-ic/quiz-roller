'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend, useThree } from '@react-three/fiber'
import { FC, type RefObject, Suspense, useEffect, useMemo, useRef } from 'react'
import { BackSide, Mesh, type Texture, type Vector3Tuple } from 'three'

import {
  TEXT_CANVAS_SCALE,
  type TextCanvasOptions,
  TRANSPARENT_TEXTURE,
  useTextCanvas,
} from '@/hooks/useTextCanvas'

import fragmentShader from './floatingHeading.frag'
import vertexShader from './floatingHeading.vert'

type Props = {
  ref?: RefObject<Mesh | null>
  text: string
  position: Vector3Tuple
  width: number
  height: number
  opacity?: number
  textCanvasOptions?: Partial<TextCanvasOptions>
}

type FloatingHeadingUniforms = {
  uTexture: Texture
  uOpacity: number
}

const FLOATING_HEADING_UNIFORMS: FloatingHeadingUniforms = {
  uTexture: TRANSPARENT_TEXTURE,
  uOpacity: 1,
}

const FloatingHeadingShader = shaderMaterial(
  FLOATING_HEADING_UNIFORMS,
  vertexShader,
  fragmentShader,
)

const FloatingHeadingMaterial = extend(FloatingHeadingShader)

export const FloatingHeading: FC<Props> = ({
  text,
  position,
  width,
  height,
  opacity = 1,
  textCanvasOptions = {},
  ref,
}) => {
  const dpr = useThree((s) => s.viewport.dpr)
  const shaderRef = useRef<typeof FloatingHeadingMaterial & FloatingHeadingUniforms>(null)
  const materialTextureRef = useRef<Texture>(TRANSPARENT_TEXTURE)

  const canvasState = useTextCanvas(text, {
    width: width * dpr * TEXT_CANVAS_SCALE,
    height: height * dpr * TEXT_CANVAS_SCALE,
    color: '#ffffff',
    ...textCanvasOptions,
    lineHeightMultiplier: 1.2,
    fontSize: 88 * dpr,
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
    const nextTexture = canvasState?.texture ?? TRANSPARENT_TEXTURE
    materialTextureRef.current = nextTexture
    if (shaderRef.current) {
      shaderRef.current.uTexture = nextTexture
    }
  }, [canvasState])

  return (
    <Suspense fallback={null}>
      <mesh ref={ref} position={position} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry
          args={[radius, radius, height, 64, 1, true, thetaStart, thetaLength]}
        />
        <FloatingHeadingMaterial
          key={(FloatingHeadingShader as unknown as { key: string }).key}
          ref={shaderRef}
          uOpacity={opacity}
          transparent
          depthTest={true}
          depthWrite={false}
          toneMapped={false}
          side={BackSide}
        />
      </mesh>
    </Suspense>
  )
}
