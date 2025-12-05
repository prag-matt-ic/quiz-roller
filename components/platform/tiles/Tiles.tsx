import { shaderMaterial, useTexture } from '@react-three/drei'
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
  Suspense,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { type InstancedBufferAttribute, Texture, Vector3, type Vector3Tuple } from 'three'

import tileDetailNoise2 from '@/assets/textures/platform/tile-noise-2.webp'
import tileDetailNoise3 from '@/assets/textures/platform/tile-noise-3.webp'
import tileDetailNoise1 from '@/assets/textures/platform/tile-noise.webp'
import { PLAYER_INITIAL_POSITION } from '@/components/GameProvider'
import { SceneQuality, usePerformanceStore } from '@/components/PerformanceProvider'
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

const INSTANCE_COUNT = COLUMNS * ROWS_RENDERED

// Shader material for proximity-driven tile visibility and coloring
type TileShaderUniforms = {
  uPlayerWorldPos: Vector3
  uScrollZ: number
  uAddDetailNoise: number
  uDetailNoiseMap1: Texture | null
  uDetailNoiseMap2: Texture | null
  uDetailNoiseMap3: Texture | null
  uHighlightRadius: number
  uFadeFullRadius: number
  uFadeMinRadius: number
  uFadeMinAlpha: number
  uShadowEnabled: number
}

const INITIAL_TILE_UNIFORMS: TileShaderUniforms = {
  uPlayerWorldPos: new Vector3(
    PLAYER_INITIAL_POSITION[0],
    PLAYER_INITIAL_POSITION[1],
    PLAYER_INITIAL_POSITION[2],
  ),
  uScrollZ: 0,
  uAddDetailNoise: 1,
  uDetailNoiseMap1: null,
  uDetailNoiseMap2: null,
  uDetailNoiseMap3: null,
  uHighlightRadius: TILE_PLAYER_HIGHLIGHT_RADIUS,
  uFadeFullRadius: TILE_PLAYER_FADE_FULL_RADIUS,
  uFadeMinRadius: TILE_PLAYER_FADE_MIN_RADIUS,
  uFadeMinAlpha: TILE_PLAYER_FADE_MIN_ALPHA,
  uShadowEnabled: 1,
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
  const sceneQuality = usePerformanceStore((s) => s.sceneQuality)
  const detailNoiseTextures = useTexture([
    tileDetailNoise1.src,
    tileDetailNoise2.src,
    tileDetailNoise3.src,
  ]) as [Texture, Texture, Texture]

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

  const onPlayerPositionChange = (newPosition: Vector3Tuple) => {
    if (!tileShader.current) return
    tileShader.current.uPlayerWorldPos.set(newPosition[0], newPosition[1], newPosition[2])
  }

  usePlayerPosition(onPlayerPositionChange)

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
        <Suspense fallback={null}>
          <TileShaderMaterial
            ref={tileShader}
            key={CustomTileShaderMaterial.key}
            transparent={true}
            {...INITIAL_TILE_UNIFORMS}
            uAddDetailNoise={Number(addDetailNoise)}
            uDetailNoiseMap1={detailNoiseTextures[0]}
            uDetailNoiseMap2={detailNoiseTextures[1]}
            uDetailNoiseMap3={detailNoiseTextures[2]}
            uShadowEnabled={sceneQuality === SceneQuality.LOW ? 0 : 1}
          />
        </Suspense>
      </instancedMesh>
    </InstancedRigidBodies>
  )
}
