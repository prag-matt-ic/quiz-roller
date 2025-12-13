'use client'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { CuboidCollider, type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { type FC, type RefObject, useRef } from 'react'
import { type Vector3Tuple } from 'three'

import { usePerformanceStore } from '@/components/PerformanceProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { type ColourTileUserData } from '@/model/schema'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'
import { COLOUR_TILE_SIZE } from '@/utils/platform/homeSection'

import colourTileFragment from './colourTile.frag'
import colourTileVertex from './colourTile.vert'

type ColourTileShaderUniforms = {
  uTime: number
  uPaletteIndex: number
  uIsActive: number
  uUseNoise: number
  uDistanceFadeEnabled: number
}

const INITIAL_COLOUR_TILE_UNIFORMS: ColourTileShaderUniforms = {
  uTime: 0,
  uPaletteIndex: 0,
  uIsActive: 0,
  uUseNoise: 1,
  uDistanceFadeEnabled: 1,
}

const ColourTileShader = shaderMaterial(
  INITIAL_COLOUR_TILE_UNIFORMS,
  colourTileVertex,
  colourTileFragment,
)
const ColourTileShaderMaterial = extend(ColourTileShader)

export type ColourTileOption = {
  index: number
  position: Vector3Tuple
  relativeZ: number
  userData: ColourTileUserData
}

type ColourTileProps = {
  option: ColourTileOption
  isActive: boolean
  ref: RefObject<RapierRigidBody | null>
  isOutOfView: RefObject<boolean>
}

const ColourTile: FC<ColourTileProps> = ({ option, isActive, ref, isOutOfView }) => {
  const shader = useRef<typeof ColourTileShaderMaterial & ColourTileShaderUniforms>(null)
  const useNoise = usePerformanceStore((s) => s.sceneConfig.colourTile.useNoise)
  const useDistanceFade = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled)

  useFrame(({ clock }) => {
    if (!shader.current) return
    if (isOutOfView.current || !useNoise) return
    shader.current.uTime = clock.elapsedTime
  })

  return (
    <RigidBody
      ref={ref}
      // KEEP DYNAMIC
      type="dynamic"
      gravityScale={0}
      friction={0}
      mass={0}
      position={option.position}
      rotation={[-Math.PI / 2, 0, 0]}
      colliders={false}
      userData={option.userData}>
      <CuboidCollider
        args={[COLOUR_TILE_SIZE / 2, COLOUR_TILE_SIZE / 2, PLAYER_RADIUS * 2]}
        sensor={true}
        collisionGroups={COLLISION_GROUPS.colourTileSensor}
      />
      <mesh>
        <planeGeometry args={[COLOUR_TILE_SIZE, COLOUR_TILE_SIZE]} />
        <ColourTileShaderMaterial
          ref={shader}
          key={ColourTileShader.key}
          transparent={true}
          depthWrite={false}
          uPaletteIndex={option.index}
          uIsActive={isActive ? 1 : 0}
          uUseNoise={useNoise ? 1 : 0}
          uDistanceFadeEnabled={useDistanceFade ? 1 : 0}
        />
      </mesh>
    </RigidBody>
  )
}

export default ColourTile
