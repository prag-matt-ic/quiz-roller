'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { FC, type RefObject, Suspense, useEffect, useMemo, useRef } from 'react'
import { BackSide, Mesh, Vector2, Vector3, type Texture, type Vector3Tuple } from 'three'
import { useGSAP } from '@gsap/react'

import {
  TEXT_CANVAS_SCALE,
  type TextCanvasOptions,
  TRANSPARENT_TEXTURE,
  useTextCanvas,
} from '@/hooks/useTextCanvas'

import { Stage, useGameStore } from '@/components/GameProvider'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'

import fragmentShader from './floatingHeading.frag'
import vertexShader from './floatingHeading.vert'

gsap.registerPlugin(useGSAP)

type Props = {
  ref?: RefObject<Mesh | null>
  text: string
  position: Vector3Tuple
  width: number
  height: number
  activeStage: Stage
  textCanvasOptions?: Partial<TextCanvasOptions>
}

type FloatingHeadingUniforms = {
  uTexture: Texture
  uOpacity: number
  uPlayerXZ: Vector2
}

const FLOATING_HEADING_UNIFORMS: FloatingHeadingUniforms = {
  uTexture: TRANSPARENT_TEXTURE,
  uOpacity: 1,
  uPlayerXZ: new Vector2(0, 0),
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
  activeStage,
  textCanvasOptions = {},
  ref,
}) => {
  const stage = useGameStore((s) => s.stage)
  const shaderRef = useRef<typeof FloatingHeadingMaterial & FloatingHeadingUniforms>(null)
  const latestPlayerXZ = useRef<[number, number]>([0, 0])

  const onPlayerPosition = (newPosition: Vector3) => {
    latestPlayerXZ.current[0] = newPosition.x
    latestPlayerXZ.current[1] = newPosition.z
    if (shaderRef.current) {
      shaderRef.current.uPlayerXZ.set(newPosition.x, newPosition.z)
    }
  }

  usePlayerPosition(onPlayerPosition)

  const dpr = useThree((s) => s.viewport.dpr)
  const materialTextureRef = useRef<Texture>(TRANSPARENT_TEXTURE)
  const opacityState = useRef({ value: 0 })

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
    const arcLength = Math.PI * 0.9 // keeps a gentle bend without wrapping the texture
    const computedRadius = Math.max(width / arcLength, 0.001)
    const start = Math.PI / 2 - arcLength / 2

    return {
      radius: computedRadius,
      thetaLength: arcLength,
      thetaStart: start,
    }
  }, [width])

  useGSAP(
    () => {
      const isActive = stage === activeStage
      if (!isActive) return

      const tween = gsap.fromTo(
        opacityState.current,
        { value: 0 },
        {
          value: 1,
          duration: 1.2,
          delay: 0.4,
          ease: 'power2.out',
          onUpdate: () => {
            if (shaderRef.current) {
              shaderRef.current.uOpacity = opacityState.current.value
            }
          },
        },
      )

      return () => {
        tween.kill()
      }
    },
    { dependencies: [stage, activeStage] },
  )

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
          uOpacity={0}
          transparent={true}
          depthTest={true}
          depthWrite={false}
          toneMapped={false}
          side={BackSide}
        />
      </mesh>
    </Suspense>
  )
}
