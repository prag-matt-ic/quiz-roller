'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { forwardRef, type RefObject } from 'react'

import fragment from '@/components/player/marble/marble.frag'
import vertex from '@/components/player/marble/marble.vert'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'

// Shader configuration
export type MarbleShaderUniforms = {
  uTime: number
  uColourRange: number
}

const INITIAL_UNIFORMS: MarbleShaderUniforms = {
  uTime: 0,
  uColourRange: 0.33, // Default to middle of palette
}

const MarbleShader = shaderMaterial(INITIAL_UNIFORMS, vertex, fragment)
export const MarbleShaderMaterial = extend(MarbleShader)

type MarbleProps = {
  playerShaderRef: RefObject<(typeof MarbleShaderMaterial & MarbleShaderUniforms) | null>
}

export const Marble = forwardRef((props: MarbleProps, ref) => {
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[PLAYER_RADIUS, 32, 32]} />
      <MarbleShaderMaterial
        key={MarbleShader.key}
        ref={props.playerShaderRef}
        uTime={INITIAL_UNIFORMS.uTime}
        uColourRange={INITIAL_UNIFORMS.uColourRange}
        transparent={false}
        depthWrite={true}
      />
    </mesh>
  )
})

Marble.displayName = 'Marble'
