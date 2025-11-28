'use client'

import { type FC, useRef } from 'react'
import { extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

import sphereVertex from './iconSphere.vert'
import sphereFragment from './iconSphere.frag'
import { SphereGeometry, Color, type Vector3Tuple, Float32BufferAttribute } from 'three'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

const ICON_SPHERE_RADIUS = 1.25
const BASE_GEOMETRY = new SphereGeometry(ICON_SPHERE_RADIUS, 32, 16).toNonIndexed()
const ICON_SPHERE_LINE_WIDTH = 2.0
const ICON_SPHERE_GLOW_STRENGTH = 4.0
const ICON_SPHERE_POSITION: Vector3Tuple = [0, 3, 0]
const DEFAULT_SURFACE_COLOR = new Color('teal')

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

const DEFAULT_LINE_COLOR = DEFAULT_SURFACE_COLOR.clone()
DEFAULT_LINE_COLOR.offsetHSL(0, 0, 0.2)

const INITIAL_ICON_SPHERE_UNIFORMS: IconSphereUniforms = {
  uSurfaceColor: DEFAULT_SURFACE_COLOR,
  uLineColor: DEFAULT_LINE_COLOR,
  uOpacity: 0.7,
  uHiddenProgress: 0,
  uLineWidth: ICON_SPHERE_LINE_WIDTH,
  uGlowStrength: ICON_SPHERE_GLOW_STRENGTH,
  uDistanceFadeEnabled: 1,
}

const GemShellShader = shaderMaterial(
  INITIAL_ICON_SPHERE_UNIFORMS,
  sphereVertex,
  sphereFragment,
)

const GemShellShaderMaterial = extend(GemShellShader)

export type IconSphereProps = {
  shouldHide: boolean
  isVisible: boolean
}

const IconSphere: FC<IconSphereProps> = ({ shouldHide, isVisible }) => {
  const shader = useRef<typeof GemShellShaderMaterial & IconSphereUniforms>(null)
  const isDistanceFadeEnabled = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled)

  const hasInitialized = useRef(false)

  useGSAP(
    () => {
      const material = shader.current
      if (!material) return

      const target = shouldHide ? 1 : 0

      if (!hasInitialized.current) {
        material.uHiddenProgress = target
        hasInitialized.current = true
        return
      }

      gsap.to(material, {
        duration: 0.4,
        uHiddenProgress: target,
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
        <GemShellShaderMaterial
          key={GemShellShader.key}
          ref={shader}
          transparent={true}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
          uDistanceFadeEnabled={isDistanceFadeEnabled ? 1 : 0}
        />
      </mesh>
    </group>
  )
}

export default IconSphere
