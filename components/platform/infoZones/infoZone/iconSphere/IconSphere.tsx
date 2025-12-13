'use client'

import { useGSAP } from '@gsap/react'
import { shaderMaterial, useTexture } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import gsap from 'gsap'
import { type FC, Suspense, useRef } from 'react'
import { AdditiveBlending, Color, SpriteMaterial, Texture, type Vector3Tuple } from 'three'

import noise from '@/assets/textures/iconSphere/noise.webp'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import useGameFrame from '@/hooks/useGameFrame'
import { INFO_ZONE_SPHERE_COLOUR } from '@/resources/colours'

import sphereFragment from './iconSphere.frag'
import sphereVertex from './iconSphere.vert'

const ICON_SPHERE_RADIUS = 1
const ICON_SPHERE_GLOW_STRENGTH = 4.0
const ICON_SPHERE_POSITION: Vector3Tuple = [0, 3, 0]

type IconSphereUniforms = {
  uSurfaceColor: Color
  uLineColor: Color
  uOpacity: number
  uGlowStrength: number
  uHiddenProgress: number
  uDistanceFadeEnabled: number
  uVeinsEnabled: number
  uTime: number
  uNoiseTexture: Texture
}

const SURFACE_COLOR = new Color(INFO_ZONE_SPHERE_COLOUR) // teal accent
const LINE_COLOR = SURFACE_COLOR.clone()
LINE_COLOR.offsetHSL(0, 0, 0.16)

const INITIAL_ICON_SPHERE_UNIFORMS: IconSphereUniforms = {
  uSurfaceColor: SURFACE_COLOR,
  uLineColor: LINE_COLOR,
  uOpacity: 0.16,
  uHiddenProgress: 0,
  uTime: 0,
  uGlowStrength: ICON_SPHERE_GLOW_STRENGTH,
  uDistanceFadeEnabled: 1,
  uVeinsEnabled: 1,
  uNoiseTexture: null as unknown as Texture,
}

const SphereShader = shaderMaterial(INITIAL_ICON_SPHERE_UNIFORMS, sphereVertex, sphereFragment)

const SphereShaderMaterial = extend(SphereShader)

export type IconSphereProps = {
  iconSrc: string
  shouldHide: boolean
  isVisible: boolean
}

const IconSphere: FC<IconSphereProps> = ({ iconSrc, shouldHide, isVisible }) => {
  const shader = useRef<typeof SphereShaderMaterial & IconSphereUniforms>(null)
  const isDistanceFadeEnabled = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled)
  const sphereSegments = usePerformanceStore((s) => s.sceneConfig.infoZoneSphere.segments)
  const enableVeins = usePerformanceStore((s) => s.sceneConfig.infoZoneSphere.enableVeins)

  const hasInitialized = useRef(false)

  const [iconTexture, noiseTexture] = useTexture([iconSrc, noise.src])
  const spriteMaterialRef = useRef<SpriteMaterial>(null)

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

  useGameFrame(({ clock }) => {
    if (!isVisible) return
    const sphereShader = shader.current
    if (!sphereShader) return
    // Drive animated veins in shader
    sphereShader.uTime = clock.elapsedTime
  })

  return (
    <group
      renderOrder={2}
      position={[0, 0, 0]}
      rotation={[Math.PI / 2, 0, 0]}
      visible={isVisible}>
      <mesh position={ICON_SPHERE_POSITION}>
        <sphereGeometry args={[ICON_SPHERE_RADIUS, sphereSegments, sphereSegments]} />
        <SphereShaderMaterial
          key={SphereShader.key}
          ref={shader}
          transparent={true}
          depthWrite={false}
          depthTest={true}
          toneMapped={false}
          blending={AdditiveBlending}
          uSurfaceColor={SURFACE_COLOR}
          uLineColor={LINE_COLOR}
          uDistanceFadeEnabled={isDistanceFadeEnabled ? 1 : 0}
          uVeinsEnabled={enableVeins ? 1 : 0}
          uNoiseTexture={noiseTexture}
        />
      </mesh>

      <Suspense>
        <sprite position={ICON_SPHERE_POSITION} scale={[0.8, 0.8, 1]}>
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
