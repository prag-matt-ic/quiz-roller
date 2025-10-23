import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  type InstancedRigidBodyProps,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useImperativeHandle, useRef } from 'react'
import { type InstancedBufferAttribute, Vector3 } from 'three'

import { PLAYER_INITIAL_POSITION } from '@/components/GameProvider'
import useGameFrame from '@/hooks/useGameFrame'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'

import tileFadeFragment from './shaders/tile.frag'
import tileFadeVertex from './shaders/tile.vert'
import {
  ENTRY_END_Z,
  ENTRY_START_Z,
  EXIT_END_Z,
  EXIT_START_Z,
  TILE_SIZE,
  TILE_THICKNESS,
} from './terrainBuilder'

// Shader material for fade-in/out
type TileShaderUniforms = {
  uEntryStartZ: number
  uEntryEndZ: number
  uPlayerWorldPos: Vector3
  uScrollZ: number
  uExitStartZ: number
  uExitEndZ: number
}

const INITIAL_TILE_UNIFORMS: TileShaderUniforms = {
  uEntryStartZ: ENTRY_START_Z,
  uEntryEndZ: ENTRY_END_Z,
  uPlayerWorldPos: new Vector3(
    PLAYER_INITIAL_POSITION[0],
    PLAYER_INITIAL_POSITION[1],
    PLAYER_INITIAL_POSITION[2],
  ),
  uScrollZ: 0,
  uExitStartZ: EXIT_START_Z,
  uExitEndZ: EXIT_END_Z,
}

const CustomTileShaderMaterial = shaderMaterial(
  INITIAL_TILE_UNIFORMS,
  tileFadeVertex,
  tileFadeFragment,
)
const TileShaderMaterial = extend(CustomTileShaderMaterial)

export type InstancedTilesHandle = {
  rigidBodies: RapierRigidBody[] | null
  visibilityAttribute: InstancedBufferAttribute | null
  answerNumberAttribute: InstancedBufferAttribute | null
  shader: (typeof TileShaderMaterial & TileShaderUniforms) | null
}

type InstancedTilesProps = {
  instances: InstancedRigidBodyProps[]
  instanceVisibility: Float32Array
  instanceSeed: Float32Array
  instanceAnswerNumber: Float32Array
  ref?: React.Ref<InstancedTilesHandle>
}

export function InstancedTiles({
  instances,
  instanceVisibility,
  instanceSeed,
  instanceAnswerNumber,
  ref,
}: InstancedTilesProps) {
  const tileRigidBodies = useRef<RapierRigidBody[]>(null)
  const instanceVisibilityBufferAttribute = useRef<InstancedBufferAttribute>(null)
  const instanceAnswerNumberBufferAttribute = useRef<InstancedBufferAttribute>(null)
  const tileShader = useRef<typeof TileShaderMaterial & TileShaderUniforms>(null)
  const playerWorldPosition = useRef<Vector3>(INITIAL_TILE_UNIFORMS.uPlayerWorldPos)

  useImperativeHandle(
    ref,
    () => ({
      get rigidBodies() {
        return tileRigidBodies.current
      },
      get visibilityAttribute() {
        return instanceVisibilityBufferAttribute.current
      },
      get answerNumberAttribute() {
        return instanceAnswerNumberBufferAttribute.current
      },
      get shader() {
        return tileShader.current
      },
    }),
    [],
  )

  usePlayerPosition((position) => {
    playerWorldPosition.current.set(position.x, position.y, position.z)
  })

  useGameFrame(() => {
    if (!tileShader.current) return
    tileShader.current.uPlayerWorldPos = playerWorldPosition.current
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
      <instancedMesh args={[undefined, undefined, instances.length]} count={instances.length}>
        <boxGeometry args={[TILE_SIZE, TILE_THICKNESS, TILE_SIZE, 1, 1, 1]}>
          <instancedBufferAttribute
            ref={instanceVisibilityBufferAttribute}
            attach="attributes-visibility"
            args={[instanceVisibility, 1]}
          />
          <instancedBufferAttribute attach="attributes-seed" args={[instanceSeed, 1]} />
          <instancedBufferAttribute
            ref={instanceAnswerNumberBufferAttribute}
            attach="attributes-answerNumber"
            args={[instanceAnswerNumber, 1]}
          />
        </boxGeometry>
        <TileShaderMaterial
          ref={tileShader}
          key={(CustomTileShaderMaterial as unknown as { key: string }).key}
          transparent={true}
          uEntryStartZ={INITIAL_TILE_UNIFORMS.uEntryStartZ}
          uEntryEndZ={INITIAL_TILE_UNIFORMS.uEntryEndZ}
          uPlayerWorldPos={playerWorldPosition.current}
          uScrollZ={INITIAL_TILE_UNIFORMS.uScrollZ}
          uExitStartZ={INITIAL_TILE_UNIFORMS.uExitStartZ}
          uExitEndZ={INITIAL_TILE_UNIFORMS.uExitEndZ}
        />
      </instancedMesh>
    </InstancedRigidBodies>
  )
}
