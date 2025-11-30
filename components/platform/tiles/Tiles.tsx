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
import { type InstancedBufferAttribute, RepeatWrapping, Texture, Vector2 } from 'three'

import tileDetailNoise from '@/assets/textures/platform/noise-texture-256x256.png'
import { PLAYER_INITIAL_POSITION } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
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

const INSTANCE_COUNT = COLUMNS * ROWS_RENDERED

// Shader material for proximity-driven tile visibility and coloring
type TileShaderUniforms = {
  uPlayerWorldPos: Vector2
  uScrollZ: number
  uAddDetailNoise: number
  uDetailNoiseMap: Texture | null
  uHighlightRadius: number
  uFadeFullRadius: number
  uFadeMinRadius: number
  uFadeMinAlpha: number
}

const INITIAL_TILE_UNIFORMS: TileShaderUniforms = {
  uPlayerWorldPos: new Vector2(PLAYER_INITIAL_POSITION[0], PLAYER_INITIAL_POSITION[2]),
  uScrollZ: 0,
  uAddDetailNoise: 1,
  uDetailNoiseMap: null,
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
  const detailNoiseTexture = useTexture(tileDetailNoise.src)
  detailNoiseTexture.wrapS = RepeatWrapping
  detailNoiseTexture.wrapT = RepeatWrapping

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
    tileShader.current.uPlayerWorldPos.set(playerPosition.current[0], playerPosition.current[2])
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
        <Suspense fallback={null}>
          <TileShaderMaterial
            ref={tileShader}
            key={CustomTileShaderMaterial.key}
            transparent={true}
            {...INITIAL_TILE_UNIFORMS}
            uAddDetailNoise={Number(addDetailNoise)}
            uDetailNoiseMap={detailNoiseTexture}
          />
        </Suspense>
      </instancedMesh>
    </InstancedRigidBodies>
  )
}
