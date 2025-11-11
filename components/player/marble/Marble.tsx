'use client'

import { shaderMaterial, useTexture } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { FC, type RefObject, Suspense, useRef } from 'react'
import * as THREE from 'three'

import normal from '@/assets/textures/marble/normal.webp'
import { useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import fragment from '@/components/player/marble/marble.frag'
import vertex from '@/components/player/marble/marble.vert'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'
import useGameFrame from '@/hooks/useGameFrame'

export type MarbleShaderUniforms = {
  uTime: number
  uPaletteIndex: number
  uConfirmingPaletteIndex: number
  uConfirmingProgress: number
  uNormalMap: THREE.Texture | null
  uNormalScale: number
  uIsFlat: boolean
}

const INITIAL_UNIFORMS: MarbleShaderUniforms = {
  uTime: 0,
  uPaletteIndex: 1, // Default to middle palette
  uConfirmingPaletteIndex: -1, // No confirming by default
  uConfirmingProgress: 0,
  uNormalMap: null,
  uNormalScale: 0.3,
  uIsFlat: false,
}

const MarbleShader = shaderMaterial(INITIAL_UNIFORMS, vertex, fragment)
export const MarbleShaderMaterial = extend(MarbleShader)

type MarbleProps = {
  ref: RefObject<THREE.Mesh | null>
}

export const Marble: FC<MarbleProps> = ({ ref }) => {
  const paletteIndex = useGameStore((s) => s.paletteIndex)
  const confirmingPaletteIndex = useGameStore((s) => s.confirmingPaletteIndex)
  const playerConfig = usePerformanceStore((s) => s.sceneConfig.player)
  const { segments, isFlat } = playerConfig
  const normalMap = useTexture(normal.src)

  const shader = useRef<typeof MarbleShaderMaterial & MarbleShaderUniforms>(null)

  // Shader time accumulator
  const shaderTime = useRef(0)
  const { confirmationProgress } = useConfirmationProgress()

  useGameFrame((_, deltaTime) => {
    if (!shader.current) return
    // Update shader animation time
    shaderTime.current += deltaTime
    shader.current.uTime = shaderTime.current

    if (confirmationProgress.current === 0 && shader.current.uConfirmingProgress === 0) return
    shader.current.uConfirmingProgress = confirmationProgress.current
  })

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[PLAYER_RADIUS, segments, segments]} />
      <Suspense fallback={null}>
        <MarbleShaderMaterial
          key={MarbleShader.key}
          ref={shader}
          uTime={INITIAL_UNIFORMS.uTime}
          uPaletteIndex={paletteIndex}
          uConfirmingPaletteIndex={confirmingPaletteIndex ?? -1}
          uNormalMap={normalMap}
          uNormalScale={INITIAL_UNIFORMS.uNormalScale}
          uIsFlat={isFlat}
        />
      </Suspense>
    </mesh>
  )
}
