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

import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import useGameFrame from '@/hooks/useGameFrame'

import fragmentShader from './floatingHeading.frag'
import vertexShader from './floatingHeading.vert'

gsap.registerPlugin(useGSAP)

type Props = {
  ref?: RefObject<Mesh | null>
  text: string
  position: Vector3Tuple
  width: number
  height: number
  isVisible?: boolean
  textCanvasOptions?: Partial<TextCanvasOptions>
}

type FloatingHeadingUniforms = {
  uTexture: Texture
  uOpacity: number
  uTime: number
  uPlayerXZ: Vector2
  uHeadingCenterXZ: Vector2
  uCameraZ: number
}

const FLOATING_HEADING_UNIFORMS: FloatingHeadingUniforms = {
  uTexture: TRANSPARENT_TEXTURE,
  uOpacity: 1,
  uTime: 0,
  uPlayerXZ: new Vector2(0, 0),
  uHeadingCenterXZ: new Vector2(0, 0),
  uCameraZ: 0,
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

  const onPlayerPosition = (newPosition: Vector3) => {
    if (!shaderRef.current) return
    shaderRef.current.uPlayerXZ.set(newPosition.x, newPosition.z)
  }

  usePlayerPosition(onPlayerPosition)

  const dpr = useThree((s) => s.viewport.dpr)
  const materialTextureRef = useRef<Texture>(TRANSPARENT_TEXTURE)
  const opacity = useRef({ value: isVisible ? 1 : 0 })

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

  useEffect(() => {
    if (!shaderRef.current) return
    shaderRef.current.uOpacity = opacity.current.value
  }, [])

  useGSAP(
    () => {
      const tween = gsap.to(opacity.current, {
        value: isVisible ? 1 : 0,
        duration: isVisible ? 1.8 : 0.4,
        delay: isVisible ? 0.3 : 0,
        ease: isVisible ? 'power2.out' : 'power2.out',
        onUpdate: () => {
          if (!shaderRef.current) return
          shaderRef.current.uOpacity = opacity.current.value
        },
      })

      return () => {
        tween.kill()
      }
    },
    { dependencies: [isVisible] },
  )

  useEffect(() => {
    const nextTexture = canvasState?.texture ?? TRANSPARENT_TEXTURE
    materialTextureRef.current = nextTexture
    if (shaderRef.current) {
      shaderRef.current.uTexture = nextTexture
    }
  }, [canvasState])

  useGameFrame((state) => {
    if (!shaderRef.current) return
    shaderRef.current.uTime = state.clock.elapsedTime
    shaderRef.current.uCameraZ = state.camera.position.z

    if (!isVisible) return
    const mesh = ref?.current
    if (!mesh) return
    mesh.getWorldPosition(tmpWorldPosition.current)
    shaderRef.current.uHeadingCenterXZ.set(
      tmpWorldPosition.current.x,
      tmpWorldPosition.current.z,
    )
  })

  return (
    <Suspense fallback={null}>
      <mesh ref={ref} position={position} rotation={[0, Math.PI / 2, 0]}>
        <cylinderGeometry
          args={[radius, radius, height, 32, 1, true, thetaStart, thetaLength]}
        />
        <FloatingHeadingMaterial
          key={FloatingHeadingShader.key}
          ref={shaderRef}
          uOpacity={0}
          uTime={0}
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
