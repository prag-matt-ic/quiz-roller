'use client'

import { useGSAP } from '@gsap/react'
import { shaderMaterial } from '@react-three/drei'
import { extend, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { type FC, type RefObject, useEffect, useMemo, useRef } from 'react'
import { BackSide, Mesh, type Texture, Vector2, Vector3, type Vector3Tuple } from 'three'

import { usePerformanceStore } from '@/components/PerformanceProvider'
import useGameFrame from '@/hooks/useGameFrame'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import {
  TEXT_CANVAS_SCALE,
  TRANSPARENT_TEXTURE,
  type TextCanvasOptions,
  useTextCanvas,
} from '@/hooks/useTextCanvas'

import fragmentShader from './floatingHeading.frag'
import vertexShader from './floatingHeading.vert'

gsap.registerPlugin(useGSAP)

type Props = {
  ref: RefObject<Mesh | null>
  text: string
  position: Vector3Tuple
  width: number
  height: number
  isVisible?: boolean
  textCanvasOptions?: Partial<TextCanvasOptions>
}

type FloatingHeadingUniforms = {
  uTexture: Texture
  uPlayerXZ: Vector2
  uHeadingCenterXZ: Vector2
  uCameraZ: number
  uEnableRotation: number
  uUsePlayerFade: number
  uDistanceFadeEnabled: number
}

const FLOATING_HEADING_UNIFORMS: FloatingHeadingUniforms = {
  uTexture: TRANSPARENT_TEXTURE,
  uPlayerXZ: new Vector2(0, 0),
  uHeadingCenterXZ: new Vector2(0, 0),
  uCameraZ: 0,
  uEnableRotation: 1,
  uUsePlayerFade: 1,
  uDistanceFadeEnabled: 1,
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
  isVisible = false,
  textCanvasOptions = {},
  ref,
}) => {
  const shaderRef = useRef<typeof FloatingHeadingMaterial & FloatingHeadingUniforms>(null)
  const tmpWorldPosition = useRef(new Vector3())
  const { shouldRotate, usePlayerFade } = usePerformanceStore(
    (s) => s.sceneConfig.floatingHeading,
  )
  const useDistanceFade = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled) // for distance faded

  const onPlayerPosition = (newPosition: Vector3Tuple) => {
    if (!shaderRef.current) return
    shaderRef.current.uPlayerXZ.set(newPosition[0], newPosition[2])
  }

  usePlayerPosition(onPlayerPosition)

  const dpr = useThree((s) => s.viewport.dpr)
  const materialTextureRef = useRef<Texture>(TRANSPARENT_TEXTURE)

  const canvasState = useTextCanvas(text, {
    width: width * dpr * TEXT_CANVAS_SCALE,
    height: height * dpr * TEXT_CANVAS_SCALE,
    color: '#ffffff',
    ...textCanvasOptions,
    lineHeightMultiplier: 1.2,
    fontSize: 80 * dpr,
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

  useGameFrame((state) => {
    if (!shaderRef.current || !isVisible) return
    shaderRef.current.uCameraZ = state.camera.position.z

    if (!shouldRotate) return
    if (!ref?.current) return
    ref.current.getWorldPosition(tmpWorldPosition.current)
    shaderRef.current.uHeadingCenterXZ.set(
      tmpWorldPosition.current.x,
      tmpWorldPosition.current.z,
    )
  })

  return (
    <mesh
      ref={ref}
      visible={isVisible}
      position={position}
      renderOrder={2}
      rotation={[0, Math.PI / 2, 0]}>
      <cylinderGeometry args={[radius, radius, height, 32, 1, true, thetaStart, thetaLength]} />
      <FloatingHeadingMaterial
        key={FloatingHeadingShader.key}
        ref={shaderRef}
        uEnableRotation={shouldRotate ? 1 : 0}
        uUsePlayerFade={usePlayerFade ? 1 : 0}
        uDistanceFadeEnabled={useDistanceFade ? 1 : 0}
        transparent={true}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
        side={BackSide}
      />
    </mesh>
  )
}
