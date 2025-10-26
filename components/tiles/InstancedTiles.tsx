import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  type InstancedRigidBodyProps,
  type RapierRigidBody,
} from '@react-three/rapier'
import { useImperativeHandle, useRef } from 'react'
import { type InstancedBufferAttribute, Vector3 } from 'three'

import { PLAYER_INITIAL_HOME_POSITION } from '@/components/GameProvider'
import useGameFrame from '@/hooks/useGameFrame'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import {
  QUESTIONS_ENTRY_END_Z,
  QUESTIONS_ENTRY_START_Z,
  QUESTIONS_EXIT_END_Z,
  QUESTIONS_EXIT_START_Z,
} from '@/utils/platform/questionSection'
import { TILE_SIZE, TILE_THICKNESS } from '@/utils/tiles'

import tileFadeFragment from './tile.frag'
import tileFadeVertex from './tile.vert'

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
  uPlayerWorldPos: new Vector3(
    PLAYER_INITIAL_HOME_POSITION[0],
    PLAYER_INITIAL_HOME_POSITION[1],
    PLAYER_INITIAL_HOME_POSITION[2],
  ),
  uScrollZ: 0,
  uEntryStartZ: QUESTIONS_ENTRY_START_Z,
  uEntryEndZ: QUESTIONS_ENTRY_END_Z,
  uExitStartZ: QUESTIONS_EXIT_START_Z,
  uExitEndZ: QUESTIONS_EXIT_END_Z,
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
  ref: React.Ref<InstancedTilesHandle>
  instances: InstancedRigidBodyProps[]
  instanceVisibility: Float32Array
  instanceSeed: Float32Array
  instanceAnswerNumber: Float32Array
  initialUniforms?: Partial<TileShaderUniforms>
}

export function InstancedTiles({
  instances,
  instanceVisibility,
  instanceSeed,
  instanceAnswerNumber,
  initialUniforms,
  ref,
}: InstancedTilesProps) {
  const tileRigidBodies = useRef<RapierRigidBody[]>(null)
  const instanceVisibilityBufferAttribute = useRef<InstancedBufferAttribute>(null)
  const instanceAnswerNumberBufferAttribute = useRef<InstancedBufferAttribute>(null)
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
      get answerNumberAttribute() {
        return instanceAnswerNumberBufferAttribute.current
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
          {...INITIAL_TILE_UNIFORMS}
          {...initialUniforms}
        />
      </instancedMesh>
    </InstancedRigidBodies>
  )
}
