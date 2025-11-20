import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  type InstancedRigidBodyProps,
  type RapierRigidBody,
} from '@react-three/rapier'
import {
  type Dispatch,
  type FC,
  type SetStateAction,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { type InstancedBufferAttribute, Vector3 } from 'three'

import { PLAYER_INITIAL_POSITION_VEC3, useGameStore } from '@/components/GameProvider'
import useGameFrame from '@/hooks/useGameFrame'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import {
  COLUMNS,
  ROWS_RENDERED,
  TILE_PLAYER_FADE_FULL_RADIUS,
  TILE_PLAYER_FADE_MIN_ALPHA,
  TILE_PLAYER_FADE_MIN_RADIUS,
  TILE_PLAYER_HIGHLIGHT_RADIUS,
  TILE_SIZE,
  TILE_THICKNESS,
} from '@/utils/tiles'

import fragmentShader from './tile.frag'
import vertexShader from './tile.vert'
import { usePerformanceStore } from '@/components/PerformanceProvider'

const INSTANCE_COUNT = COLUMNS * ROWS_RENDERED

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
}

const CustomTileShaderMaterial = shaderMaterial(
  INITIAL_TILE_UNIFORMS,
  vertexShader,
  fragmentShader,
)

const TileShaderMaterial = extend(CustomTileShaderMaterial)

export type TilesHandle = {
  rigidBodies: RapierRigidBody[] | null
  visibilityAttribute: InstancedBufferAttribute | null
  highlightedAttribute: InstancedBufferAttribute | null
  shader: (typeof TileShaderMaterial & TileShaderUniforms) | null
  visibilityData: Float32Array | null
  seedData: Float32Array | null
  highlightedData: Float32Array | null
  setTileInstances: Dispatch<SetStateAction<InstancedRigidBodyProps[]>>
}

type PlatformTilesProps = {
  ref: React.Ref<TilesHandle>
  onReadyChange: (isReady: boolean) => void
}

export const PlatformTiles: FC<PlatformTilesProps> = ({ ref, onReadyChange }) => {
  const addDetailNoise = usePerformanceStore((s) => s.sceneConfig.platformTiles.addDetailNoise)
  const paletteIndex = useGameStore((s) => s.paletteIndex)

  const [instances, setTileInstances] = useState<InstancedRigidBodyProps[]>([])
  const tileRigidBodies = useRef<RapierRigidBody[]>(null)

  const visibilityData = useRef<Float32Array>(new Float32Array(INSTANCE_COUNT))
  const highlightedData = useRef<Float32Array>(new Float32Array(INSTANCE_COUNT))
  const seedData = useRef<Float32Array>(new Float32Array(INSTANCE_COUNT))

  const visibilityAttribute = useRef<InstancedBufferAttribute>(null)
  const highlightedAttribute = useRef<InstancedBufferAttribute>(null)

  const tileShader = useRef<typeof TileShaderMaterial & TileShaderUniforms>(null)

  useImperativeHandle(ref, () => {
    return {
      get rigidBodies() {
        return tileRigidBodies.current
      },
      get visibilityData() {
        return visibilityData.current
      },
      get visibilityAttribute() {
        return visibilityAttribute.current
      },
      get highlightedData() {
        return highlightedData.current
      },
      get highlightedAttribute() {
        return highlightedAttribute.current
      },
      get shader() {
        return tileShader.current
      },
      get seedData() {
        return seedData.current
      },
      setTileInstances,
    }
  }, [])

  const { playerPosition } = usePlayerPosition()

  useGameFrame(() => {
    if (!tileShader.current) return
    tileShader.current.uPlayerWorldPos = playerPosition.current
    tileShader.current.uPaletteIndex = paletteIndex
  })

  useEffect(() => {
    onReadyChange(true)
    return () => {
      onReadyChange(false)
    }
  }, [onReadyChange])

  return (
    <InstancedRigidBodies
      ref={tileRigidBodies}
      instances={instances}
      type="fixed"
      sensor={false}
      colliders="cuboid"
      friction={0.0}>
      <instancedMesh
        args={[undefined, undefined, instances.length]}
        frustumCulled={false}
        count={instances.length}>
        <boxGeometry args={[TILE_SIZE, TILE_THICKNESS, TILE_SIZE, 1, 1, 1]}>
          <instancedBufferAttribute
            ref={visibilityAttribute}
            attach="attributes-visibility"
            args={[visibilityData.current!, 1]}
          />
          <instancedBufferAttribute attach="attributes-seed" args={[seedData.current!, 1]} />
          <instancedBufferAttribute
            ref={highlightedAttribute}
            attach="attributes-isHighlighted"
            args={[highlightedData.current!, 1]}
          />
        </boxGeometry>
        <TileShaderMaterial
          ref={tileShader}
          key={(CustomTileShaderMaterial as unknown as { key: string }).key}
          transparent={true}
          {...INITIAL_TILE_UNIFORMS}
          uAddDetailNoise={Number(addDetailNoise)}
        />
      </instancedMesh>
    </InstancedRigidBodies>
  )
}
