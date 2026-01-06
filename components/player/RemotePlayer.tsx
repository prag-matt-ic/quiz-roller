'use client'

import { BallCollider, type RapierRigidBody, RigidBody } from '@react-three/rapier'
import { useRef } from 'react'
import { type Mesh } from 'three'

import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { Marble } from '@/components/player/marble/Marble'
import { useGameFrame } from '@/hooks/useGameFrame'
import { type RemotePlayerData } from '@/stores/types'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'
import {
  createInterpolationState,
  interpolatePosition,
  interpolateRotation,
} from '@/utils/multiplayer'

// Time-based interpolation for consistent smoothing across framerates
const INTERPOLATION_TIME_S = 0.15 // Match responsiveness of local player input smoothing

/**
 * RemotePlayer
 *
 * Renders a remote player's marble with physics simulation.
 *
 * POSITIONING LOGIC (REF-BASED - NO RE-RENDERS):
 * - Position data stored in positionRef (updated directly, no state changes)
 * - useGameFrame reads fresh position from ref every frame
 * - Position is now directly the world position (ball moves in world space)
 * - No coordinate transformation needed!
 *
 * PERFORMANCE:
 * - Zero re-renders from position updates (ref-based)
 * - Pre-allocated vectors for interpolation (no per-frame allocations)
 * - Only re-renders when player is added/removed (rare)
 */
const RemotePlayer = ({ positionRef }: RemotePlayerData) => {
  const bodyRef = useRef<RapierRigidBody>(null)
  const sphereMeshRef = useRef<Mesh>(null)

  // Pre-allocated interpolation state (performance optimization)
  const interpolation = useRef(createInterpolationState(0, 4, 0))
  const hasInitialized = useRef(false)

  useGameFrame((_, deltaTime) => {
    if (!bodyRef.current || !sphereMeshRef.current) return

    // Read fresh position from ref (NO state subscription, NO re-render)
    const positionData = positionRef.current
    if (!positionData?.worldPosition) return

    const { worldPosition, rotation } = positionData

    // Position IS the visual position (ball moves in world space)
    // No coordinate transformation needed!

    // Initialize position on first valid frame
    if (!hasInitialized.current) {
      interpolation.current.currentPos.set(worldPosition.x, worldPosition.y, worldPosition.z)
      hasInitialized.current = true
    }

    // Time-based lerp factor: how much to move toward target this frame
    // At 60fps with 0.15s interpolation time, this is ~0.1 per frame (smoother than old 0.2)
    const lerpFactor = Math.min(1, deltaTime / INTERPOLATION_TIME_S)

    // Smoothly interpolate position
    const currentPos = interpolatePosition(
      interpolation.current,
      worldPosition.x,
      worldPosition.y,
      worldPosition.z,
      lerpFactor,
    )

    // Update kinematic rigid body position
    bodyRef.current.setNextKinematicTranslation({
      x: currentPos.x,
      y: currentPos.y,
      z: currentPos.z,
    })

    // Interpolate rotation if provided
    if (rotation) {
      const currentQuat = interpolateRotation(
        interpolation.current,
        sphereMeshRef.current.quaternion,
        rotation.x,
        rotation.y,
        rotation.z,
        rotation.w,
        lerpFactor,
      )
      sphereMeshRef.current.quaternion.copy(currentQuat)
    }
  })

  return (
    <RigidBody ref={bodyRef} type="kinematicPosition" colliders={false} position={[4, 0, 0]}>
      <BallCollider args={[PLAYER_RADIUS]} collisionGroups={COLLISION_GROUPS.player} />
      <Marble ref={sphereMeshRef} paletteRange={[0.65, 1.0]} distanceFadeEnabled />
    </RigidBody>
  )
}

export default RemotePlayer
