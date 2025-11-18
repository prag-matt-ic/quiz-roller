'use client'

import { CuboidCollider, RapierRigidBody, RigidBody } from '@react-three/rapier'
import { type FC, type RefObject, useMemo, useRef } from 'react'
import { type Vector3Tuple } from 'three'
import { shaderMaterial } from '@react-three/drei'
import { useGameStore } from '@/components/GameProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import GemModel from '@/components/collectible/GemModel'
import Particles from '@/components/collectible/particles/Particles'
import { Collectible as CollectibleType, type CollectibleUserData } from '@/model/schema'
import vertexShader from './collectibleTile.vert'
import fragmentShader from './collectibleTile.frag'
import { extend, useFrame } from '@react-three/fiber'
import { useConfirmationProgress } from '@/hooks/useConfirmationProgress'

type TileShaderUniforms = {
  uConfirmingProgress: number
  uIsConfirming: number
  uTileAspect: number
  uTime: number
  uPlayerPaletteIndex: number
}

const INITIAL_ANSWER_TILE_UNIFORMS: TileShaderUniforms = {
  uConfirmingProgress: 0,
  uIsConfirming: 0,
  uTileAspect: 1,
  uTime: 0,
  uPlayerPaletteIndex: 1,
}

const CollectibleTileShader = shaderMaterial(
  INITIAL_ANSWER_TILE_UNIFORMS,
  vertexShader,
  fragmentShader,
)

const CollectibleTileShaderMaterial = extend(CollectibleTileShader)

const GEM_POSITION: Vector3Tuple = [0, -1, 2.5]
const GEM_SCALE = 0.08

type Props = {
  ref?: RefObject<RapierRigidBody | null>
  position: Vector3Tuple
  width: number
  height: number
  contentIndex: number
  isOutOfView: RefObject<boolean>
}

export const Collectible: FC<Props> = ({
  ref,
  position,
  width,
  height,
  contentIndex,
  isOutOfView,
}) => {
  const isCollected = useGameStore((s) => s.collectedCollectibles.includes(contentIndex))
  const paletteIndex = useGameStore((s) => s.paletteIndex)

  const shader = useRef<typeof CollectibleTileShaderMaterial & TileShaderUniforms>(null)

  const localProgress = useRef(0)
  const { confirmationProgress } = useConfirmationProgress()
  const isConfirming = useGameStore((s) => s.confirmingCollectible === contentIndex)

  useFrame(({ clock }) => {
    if (!shader.current) return
    if (isOutOfView.current) return
    const globalProgress = confirmationProgress.current

    if (isConfirming) {
      // If confirming, track the global progress upward
      localProgress.current = Math.max(localProgress.current, globalProgress)
    } else {
      // Not confirming: only allow progress to decrease, following global progress
      localProgress.current = Math.min(localProgress.current, globalProgress)
    }

    shader.current.uConfirmingProgress = localProgress.current
    shader.current.uIsConfirming = isConfirming ? 1 : 0
    shader.current.uTime = clock.elapsedTime
  })

  const tileAspect = width / height

  const userData = useMemo<CollectibleUserData>(
    () => ({
      type: 'collectible',
      collectible: CollectibleType.Gem,
      index: contentIndex,
    }),
    [contentIndex],
  )

  return (
    <RigidBody
      ref={ref}
      type="dynamic"
      gravityScale={0}
      friction={0}
      mass={0}
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      colliders={false}
      userData={userData}>
      <CuboidCollider
        args={[width / 2, height / 2, PLAYER_RADIUS * 2]}
        sensor={true}
        mass={0}
        friction={0}
      />

      {/* Tile mesh: shader renders border */}
      <mesh position={[0, 0, 0.01]} renderOrder={2}>
        <planeGeometry args={[width, height]} />
        <CollectibleTileShaderMaterial
          key={CollectibleTileShader.key}
          ref={shader}
          transparent={true}
          depthTest={true}
          depthWrite={false}
          uConfirmingProgress={0}
          uIsConfirming={0}
          uPlayerPaletteIndex={paletteIndex}
          uTileAspect={tileAspect}
        />
      </mesh>

      <pointLight intensity={isCollected ? 2 : 0} position={[-2, 0, 5]}>
        {/* Visualises light position */}
        <mesh>
          <sphereGeometry args={[0.25, 16, 16]} />
        </mesh>
      </pointLight>

      {/* TODO: we shouldn't conditionally mount models, they should have opacity/hidden toggled. */}
      {isCollected && <GemModel position={GEM_POSITION} scale={GEM_SCALE} />}
      <Particles width={width} height={height} wasConfirmed={isCollected} />
    </RigidBody>
  )
}

export default Collectible
