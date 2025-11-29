'use client'

import { useGSAP } from '@gsap/react'
import { shaderMaterial, useTexture } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import gsap from 'gsap'
import { type FC, Suspense, useMemo, useRef } from 'react'
import {
  AdditiveBlending,
  Color,
  Float32BufferAttribute,
  SphereGeometry,
  SpriteMaterial,
  type Vector3Tuple,
} from 'three'

import { usePerformanceStore } from '@/components/PerformanceProvider'

import sphereFragment from './iconSphere.frag'
import sphereVertex from './iconSphere.vert'

const ICON_SPHERE_RADIUS = 1
const BASE_GEOMETRY = new SphereGeometry(ICON_SPHERE_RADIUS, 32, 16).toNonIndexed()
const ICON_SPHERE_LINE_WIDTH = 1.0
const ICON_SPHERE_GLOW_STRENGTH = 3.0
const ICON_SPHERE_POSITION: Vector3Tuple = [0, 3, 0]

const ICON_SPHERE_SURFACE_GEOMETRY = (() => {
  const geometry = BASE_GEOMETRY.clone()
  const positionCount = geometry.attributes.position.count
  const barycentric = new Float32Array(positionCount * 3)

  for (let i = 0; i < positionCount; i += 3) {
    const start = i * 3
    barycentric[start + 0] = 1
    barycentric[start + 1] = 0
    barycentric[start + 2] = 0

    barycentric[start + 3] = 0
    barycentric[start + 4] = 1
    barycentric[start + 5] = 0

    barycentric[start + 6] = 0
    barycentric[start + 7] = 0
    barycentric[start + 8] = 1
  }

  geometry.setAttribute('aBarycentric', new Float32BufferAttribute(barycentric, 3))
  geometry.computeVertexNormals()
  return geometry
})()

type IconSphereUniforms = {
  uSurfaceColor: Color
  uLineColor: Color
  uOpacity: number
  uLineWidth: number
  uGlowStrength: number
  uHiddenProgress: number
  uDistanceFadeEnabled: number
}

const DEFAULT_SURFACE_COLOR = new Color('#37D6C7') // teal accent
const DEFAULT_LINE_COLOR = DEFAULT_SURFACE_COLOR.clone()
DEFAULT_LINE_COLOR.offsetHSL(0, 0, 0.2)

const INITIAL_ICON_SPHERE_UNIFORMS: IconSphereUniforms = {
  uSurfaceColor: DEFAULT_SURFACE_COLOR,
  uLineColor: DEFAULT_LINE_COLOR,
  uOpacity: 0.4,
  uHiddenProgress: 0,
  uLineWidth: ICON_SPHERE_LINE_WIDTH,
  uGlowStrength: ICON_SPHERE_GLOW_STRENGTH,
  uDistanceFadeEnabled: 1,
}

const SphereShader = shaderMaterial(INITIAL_ICON_SPHERE_UNIFORMS, sphereVertex, sphereFragment)

const SphereShaderMaterial = extend(SphereShader)

export type IconSphereProps = {
  iconSrc: string
  shouldHide: boolean
  isVisible: boolean
  colour?: string
}

const IconSphere: FC<IconSphereProps> = ({ iconSrc, shouldHide, isVisible, colour }) => {
  const shader = useRef<typeof SphereShaderMaterial & IconSphereUniforms>(null)
  const isDistanceFadeEnabled = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled)

  const hasInitialized = useRef(false)

  const iconTexture = useTexture(iconSrc)
  const spriteMaterialRef = useRef<SpriteMaterial>(null)

  const { surfaceColour, lineColour } = useMemo(() => {
    if (!colour) {
      return {
        surfaceColour: DEFAULT_SURFACE_COLOR,
        lineColour: DEFAULT_LINE_COLOR,
      }
    }
    const surfaceColour = new Color(colour)
    const lineColour = surfaceColour.clone()
    lineColour.offsetHSL(0, 0, 0.16)
    return { surfaceColour, lineColour }
  }, [colour])

  useGSAP(
    () => {
      const sphereShader = shader.current
      const spriteMaterial = spriteMaterialRef.current
      if (!sphereShader || !spriteMaterial) return

      const target = shouldHide ? 1 : 0

      if (!hasInitialized.current) {
        sphereShader.uHiddenProgress = target
        hasInitialized.current = true
        return
      }

      gsap.to(sphereShader, {
        duration: 0.6,
        uHiddenProgress: shouldHide ? 1 : 0,
        ease: 'power2.out',
        overwrite: true,
      })
      gsap.to(spriteMaterial, {
        duration: 0.3,
        opacity: shouldHide ? 0 : 1,
        ease: 'power2.out',
        overwrite: true,
      })
    },
    { dependencies: [shouldHide] },
  )

  return (
    <group
      renderOrder={2}
      position={[0, 0, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      visible={isVisible}>
      <mesh
        geometry={ICON_SPHERE_SURFACE_GEOMETRY}
        dispose={null}
        position={ICON_SPHERE_POSITION}>
        <SphereShaderMaterial
          key={SphereShader.key}
          ref={shader}
          transparent={true}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
          blending={AdditiveBlending}
          uSurfaceColor={surfaceColour}
          uLineColor={lineColour}
          uDistanceFadeEnabled={isDistanceFadeEnabled ? 1 : 0}
        />
      </mesh>

      <Suspense>
        <sprite position={ICON_SPHERE_POSITION}>
          <spriteMaterial
            ref={spriteMaterialRef}
            map={iconTexture}
            transparent={true}
            depthWrite={false}
            depthTest={false}
            toneMapped={false}
          />
        </sprite>
      </Suspense>
    </group>
  )
}

export default IconSphere
