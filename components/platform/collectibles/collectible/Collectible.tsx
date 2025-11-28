'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import { type FC, type RefObject, useMemo, useRef } from 'react'
import {
  DataTexture,
  FloatType,
  Group,
  Mesh,
  RGBAFormat,
  Vector3,
  type Vector3Tuple,
} from 'three'
import { MeshSurfaceSampler } from 'three/addons/math/MeshSurfaceSampler.js'

import { useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import Gem, { type GemShellRef } from '@/components/platform/collectibles/collectible/gem/Gem'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'
import useGameFrame from '@/hooks/useGameFrame'
import { CollectibleID, type CollectibleUserData } from '@/model/schema'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'
import { HIDDEN_POSITION, TILE_SIZE } from '@/utils/tiles'

import fragmentShader from './collectibleTile.frag'
import vertexShader from './collectibleTile.vert'

// Sample the surface of the gem model to position particles within it.

type TileShaderUniforms = {
  uConfirmingProgress: number
  uIsConfirming: number
  uWasConfirmed: number
  uTime: number
  uAspect: number
  uTilesX: number
  uTilesY: number
  uDistanceFadeEnabled: number
}

const INITIAL_ANSWER_TILE_UNIFORMS: TileShaderUniforms = {
  uConfirmingProgress: 0,
  uIsConfirming: 0,
  uWasConfirmed: 0,
  uTime: 0,
  uAspect: 1,
  uTilesX: 5,
  uTilesY: 5,
  uDistanceFadeEnabled: 1,
}

const CollectibleTileShader = shaderMaterial(
  INITIAL_ANSWER_TILE_UNIFORMS,
  vertexShader,
  fragmentShader,
)

const CollectibleTileShaderMaterial = extend(CollectibleTileShader)

type Props = {
  ref: RefObject<RapierRigidBody | null>
  id: CollectibleID
  isVisible: boolean
  width: number
  height: number
}

export const Collectible: FC<Props> = ({ ref, width, height, id, isVisible }) => {
  const isCollected = useGameStore((s) => s.collectedCollectibles.includes(id))
  const isConfirming = useGameStore((s) => s.confirmingCollectible === id)
  const useDistanceFade = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled)

  const shader = useRef<typeof CollectibleTileShaderMaterial & TileShaderUniforms>(null)
  const gemShaderRef = useRef<GemShellRef>(null)
  const localProgress = useRef(0)
  const gemRotationGroupRef = useRef<Group>(null)
  const { confirmationProgress } = useConfirmationProgress()

  useGameFrame((state, delta) => {
    const { clock } = state
    if (!shader.current) return
    if (!isVisible) return
    const globalProgress = confirmationProgress.current

    if (isConfirming) {
      // If confirming, track the global progress upward
      localProgress.current = Math.max(localProgress.current, globalProgress)
    } else {
      // Not confirming: only allow progress to decrease, following global progress
      localProgress.current = Math.min(localProgress.current, globalProgress)
    }

    if (isCollected) {
      localProgress.current = 1.0
    }

    shader.current.uConfirmingProgress = localProgress.current
    shader.current.uIsConfirming = isConfirming ? 1 : 0
    shader.current.uWasConfirmed = isCollected ? 1 : 0
    shader.current.uTime = clock.elapsedTime

    if (gemShaderRef.current) {
      gemShaderRef.current.uConfirmingProgress = isCollected ? 1.0 : localProgress.current
      gemShaderRef.current.uTime = clock.elapsedTime
    }

    if (!gemRotationGroupRef?.current) return
    gemRotationGroupRef.current.rotation.y += delta * 0.4
  })

  const tileAspect = width / height
  const tilesX = width / TILE_SIZE
  const tilesY = height / TILE_SIZE

  const userData = useMemo<CollectibleUserData>(
    () => ({
      type: 'collectible',
      collectibleType: id,
    }),
    [id],
  )

  return (
    <RigidBody
      ref={ref}
      type="dynamic"
      gravityScale={0}
      friction={0}
      mass={0}
      position={HIDDEN_POSITION} // Overwritten dynamically in the parent
      rotation={[-Math.PI / 2, 0, 0]}
      colliders={false}
      userData={userData}>
      <CuboidCollider
        args={[width / 2, height / 2, PLAYER_RADIUS * 2]}
        sensor={true}
        mass={0}
        friction={0}
        collisionGroups={COLLISION_GROUPS.collectibleSensor}
      />

      {/* Tile mesh: shader renders corner brackets and confirmation progress bar */}
      <mesh position={[0, 0, 0.01]} renderOrder={2} visible={isVisible}>
        <planeGeometry args={[width, height]} />
        <CollectibleTileShaderMaterial
          key={CollectibleTileShader.key}
          ref={shader}
          transparent={true}
          depthTest={true}
          depthWrite={false}
          uConfirmingProgress={0}
          uIsConfirming={0}
          uAspect={tileAspect}
          uTilesX={tilesX}
          uTilesY={tilesY}
          uDistanceFadeEnabled={useDistanceFade ? 1 : 0}
        />
      </mesh>

      <Gem
        ref={gemRotationGroupRef}
        key={`gem-${id}`}
        shaderRef={gemShaderRef}
        isCollected={isCollected}
        tileWidth={width}
        tileHeight={height}
        id={id}
        isVisible={isVisible}
      />
    </RigidBody>
  )
}

export default Collectible

// ------------------
// DataTexture + position field generation (copied from previous FBO setup)
// ------------------

export const createDataTextureFromSeeds = (
  seeds: Float32Array,
  textureSize: number,
): DataTexture => {
  const expectedLength = textureSize * textureSize * 4
  const data = new Float32Array(expectedLength)
  for (let i = 0; i < textureSize * textureSize; i++) {
    data[i * 4] = seeds[i] !== undefined ? seeds[i] : 0
    data[i * 4 + 1] = 0
    data[i * 4 + 2] = 0
    data[i * 4 + 3] = 1
  }
  const dt = new DataTexture(data, textureSize, textureSize, RGBAFormat, FloatType)
  dt.needsUpdate = true
  return dt
}

export const createDataTextureFromPositions = (
  positions: Float32Array,
  textureSize: number,
): DataTexture => {
  const expectedLength = textureSize * textureSize * 4
  if (positions.length !== expectedLength) {
    const padded = new Float32Array(expectedLength)
    padded.set(positions)
    positions = padded
  }
  const dt = new DataTexture(positions, textureSize, textureSize, RGBAFormat, FloatType)
  dt.needsUpdate = true
  return dt
}

export const getMeshSurfacePositions = ({
  mesh,
  count,
  scale,
  offset,
  extrude,
}: {
  mesh: Mesh
  count: number
  scale?: number
  offset?: Vector3
  extrude?: number
}): Float32Array => {
  const positions = new Float32Array(count * 4)
  const sampler = new MeshSurfaceSampler(mesh).build()
  const pos = new Vector3()
  const normal = new Vector3()

  for (let i = 0; i < count; i++) {
    sampler.sample(pos, normal)
    if (!!extrude) pos.addScaledVector(normal, extrude)
    if (!!scale) pos.multiplyScalar(scale)
    if (!!offset) pos.add(offset)
    positions.set([pos.x, pos.y, pos.z, 1.0], i * 4)
  }

  return positions
}
