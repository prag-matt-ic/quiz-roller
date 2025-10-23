'use client'

import { shaderMaterial, useTexture } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { forwardRef, type RefObject, Suspense } from 'react'
import * as THREE from 'three'

import normal from '@/assets/textures/marble/normal.png'
import { useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import fragment from '@/components/player/marble/marble.frag'
import vertex from '@/components/player/marble/marble.vert'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'

// Shader configuration
export type MarbleShaderUniforms = {
  uTime: number
  uPlayerColourIndex: number
  uNormalMap: THREE.Texture | null
  uNormalScale: number
}

const INITIAL_UNIFORMS: MarbleShaderUniforms = {
  uTime: 0,
  uPlayerColourIndex: 1, // Default to middle band
  uNormalMap: null,
  uNormalScale: 0.15,
}

const MarbleShader = shaderMaterial(INITIAL_UNIFORMS, vertex, fragment)
export const MarbleShaderMaterial = extend(MarbleShader)

type MarbleProps = {
  playerShaderRef: RefObject<(typeof MarbleShaderMaterial & MarbleShaderUniforms) | null>
}

export const Marble = forwardRef((props: MarbleProps, ref) => {
  const playerColourIndex = useGameStore((s) => s.playerColourIndex)
  const playerConfig = usePerformanceStore((s) => s.sceneConfig.player)
  const { segments } = playerConfig
  const normalMap = useTexture(normal.src)

  return (
    <mesh ref={ref}>
      <sphereGeometry args={[PLAYER_RADIUS, segments, segments]} />
      <Suspense fallback={null}>
        <MarbleShaderMaterial
          key={MarbleShader.key}
          ref={props.playerShaderRef}
          uTime={INITIAL_UNIFORMS.uTime}
          uPlayerColourIndex={playerColourIndex}
          uNormalMap={normalMap}
          uNormalScale={INITIAL_UNIFORMS.uNormalScale}
        />
      </Suspense>
    </mesh>
  )
})

Marble.displayName = 'Marble'
