import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  type InstancedRigidBodyProps,
  type RapierRigidBody,
} from '@react-three/rapier'
import { FC, useImperativeHandle, useRef } from 'react'
import { type InstancedBufferAttribute, Vector3 } from 'three'

import { PLAYER_INITIAL_POSITION_VEC3, useGameStore } from '@/components/GameProvider'
import useGameFrame from '@/hooks/useGameFrame'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import {
  TILE_PLAYER_FADE_FULL_RADIUS,
  TILE_PLAYER_FADE_MIN_ALPHA,
  TILE_PLAYER_FADE_MIN_RADIUS,
  TILE_PLAYER_FADE_LIFT,
  TILE_PLAYER_HIGHLIGHT_RADIUS,
  TILE_SIZE,
  TILE_THICKNESS,
} from '@/utils/tiles'

import fragmentShader from './tile.frag'
import vertexShader from './tile.vert'
import { usePerformanceStore } from '@/components/PerformanceProvider'

// Shader material for proximity-driven tile visibility and coloring
type TileShaderUniforms = {
  uPlayerWorldPos: Vector3
  uScrollZ: number
  uAddDetailNoise: number
  uPaletteIndex: number
  uHighlightRadius: number
  uFadeFullRadius: number
  uFadeMinRadius: number
  uFadeMinAlpha: number
  uFadeLiftHeight: number
}

const INITIAL_TILE_UNIFORMS: TileShaderUniforms = {
  uPlayerWorldPos: PLAYER_INITIAL_POSITION_VEC3,
  uScrollZ: 0,
  uAddDetailNoise: 1,
  uPaletteIndex: 0,
  uHighlightRadius: TILE_PLAYER_HIGHLIGHT_RADIUS,
  uFadeFullRadius: TILE_PLAYER_FADE_FULL_RADIUS,
  uFadeMinRadius: TILE_PLAYER_FADE_MIN_RADIUS,
  uFadeMinAlpha: TILE_PLAYER_FADE_MIN_ALPHA,
  uFadeLiftHeight: TILE_PLAYER_FADE_LIFT,
}

const CustomTileShaderMaterial = shaderMaterial(
  INITIAL_TILE_UNIFORMS,
  vertexShader,
  fragmentShader,
)
const TileShaderMaterial = extend(CustomTileShaderMaterial)

export type InstancedTilesHandle = {
  rigidBodies: RapierRigidBody[] | null
  visibilityAttribute: InstancedBufferAttribute | null
  isHighlightedAttribute: InstancedBufferAttribute | null
  shader: (typeof TileShaderMaterial & TileShaderUniforms) | null
}

type InstancedTilesProps = {
  ref: React.Ref<InstancedTilesHandle>
  instances: InstancedRigidBodyProps[]
  instanceVisibility: Float32Array
  instanceSeed: Float32Array
  instanceIsHighlighted: Float32Array
  initialUniforms?: Partial<TileShaderUniforms>
}

export const PlatformTiles: FC<InstancedTilesProps> = ({
  instances,
  instanceVisibility,
  instanceSeed,
  instanceIsHighlighted,
  initialUniforms,
  ref,
}) => {
  const addDetailNoise = usePerformanceStore((s) => s.sceneConfig.platformTiles.addDetailNoise)
  const paletteIndex = useGameStore((s) => s.paletteIndex)
  const tileRigidBodies = useRef<RapierRigidBody[]>(null)
  const instanceVisibilityBufferAttribute = useRef<InstancedBufferAttribute>(null)
  const instanceIsHighlightedBufferAttribute = useRef<InstancedBufferAttribute>(null)
  const tileShader = useRef<typeof TileShaderMaterial & TileShaderUniforms>(null)

  useImperativeHandle(
    ref,
    () => ({
      get rigidBodies() {
        return tileRigidBodies.current
      },
      get visibilityAttribute() {
        return instanceVisibilityBufferAttribute.current
      },
      get isHighlightedAttribute() {
        return instanceIsHighlightedBufferAttribute.current
      },
      get shader() {
        return tileShader.current
      },
    }),
    [],
  )

  const { playerPosition } = usePlayerPosition()

  useGameFrame(() => {
    if (!tileShader.current) return
    tileShader.current.uPlayerWorldPos = playerPosition.current
    tileShader.current.uPaletteIndex = paletteIndex
  })

  return (
    <InstancedRigidBodies
      ref={tileRigidBodies}
      instances={instances}
      type="fixed"
      canSleep={false}
      sensor={false}
      colliders="cuboid"
      friction={0.0}>
      <instancedMesh
        args={[undefined, undefined, instances.length]}
        frustumCulled={false}
        count={instances.length}>
        <boxGeometry args={[TILE_SIZE, TILE_THICKNESS, TILE_SIZE, 1, 1, 1]}>
          <instancedBufferAttribute
            ref={instanceVisibilityBufferAttribute}
            attach="attributes-visibility"
            args={[instanceVisibility, 1]}
          />
          <instancedBufferAttribute attach="attributes-seed" args={[instanceSeed, 1]} />
          <instancedBufferAttribute
            ref={instanceIsHighlightedBufferAttribute}
            attach="attributes-isHighlighted"
            args={[instanceIsHighlighted, 1]}
          />
        </boxGeometry>
        <TileShaderMaterial
          ref={tileShader}
          key={(CustomTileShaderMaterial as unknown as { key: string }).key}
          transparent={true}
          {...INITIAL_TILE_UNIFORMS}
          {...initialUniforms}
          uAddDetailNoise={Number(addDetailNoise)}
        />
      </instancedMesh>
    </InstancedRigidBodies>
  )
}
