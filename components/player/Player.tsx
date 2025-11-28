'use client'

import { QueryFilterFlags } from '@dimforge/rapier3d-compat'
import {
  BallCollider,
  type IntersectionEnterHandler,
  type IntersectionExitHandler,
  type RapierCollider,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import { type FC, useEffect, useRef } from 'react'
import { Mesh, type Object3D, Vector3 } from 'three'

import {
  type EdgeWarningIntensities,
  PLAYER_INITIAL_POSITION,
  useGameStore,
} from '@/components/GameProvider'
import PlayerHUD, { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { Marble } from '@/components/player/marble/Marble'
import { useGameFrame } from '@/hooks/useGameFrame'
import usePlayerController from '@/hooks/usePlayerController'
import type { PlayerUserData, RigidBodyUserData } from '@/model/schema'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'
import {
  COLUMNS,
  ENTRY_END_Z,
  EPSILON,
  EXIT_START_Z,
  PLAYER_MOVE_UNITS,
  TERRAIN_SPEED_UNITS,
  TILE_SIZE,
} from '@/utils/tiles'

// https://rapier.rs/docs/user_guides/javascript/rigid_bodies
// https://rapier.rs/docs/user_guides/javascript/colliders
// https://rapier.rs/docs/user_guides/javascript/character_controller/

// Physics constants
const GRAVITY_ACCELERATION = -9.81 // m/s²
const UP_DIRECTION = new Vector3(0, 1, 0)
const PLATFORM_HALF_WIDTH = (COLUMNS * TILE_SIZE) / 2 - 1
const EDGE_APPROACH_MARGIN = TILE_SIZE * 1.5
const ROW_RAISE_BACK_BOUNDARY_Z = ENTRY_END_Z
const ROW_RAISE_FRONT_BOUNDARY_Z = EXIT_START_Z
const edgeWarningScratch: EdgeWarningIntensities = {
  left: 0,
  right: 0,
  near: 0,
  far: 0,
}

const Player: FC = () => {
  const onOutOfBounds = useGameStore((s) => s.onOutOfBounds)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  // const setEdgeWarningIntensities = useGameStore((s) => s.setEdgeWarningIntensities)
  const setConfirmingCollectible = useGameStore((s) => s.setConfirmingCollectible)
  const isPlatformReady = useGameStore((s) => s.isPlatformReady)
  const playerStatus = useGameStore((s) => s.playerStatus)
  const respawnPosition = useGameStore((s) => s.respawnPosition)
  const onRespawnComplete = useGameStore((s) => s.onRespawnComplete)

  const { controllerRef, input } = usePlayerController()

  // Refs for physics bodies and meshes
  const bodyRef = useRef<RapierRigidBody>(null)
  const ballColliderRef = useRef<RapierCollider | null>(null)
  const sphereMeshRef = useRef<Mesh>(null)

  // Preallocated vectors for physics calculations (performance optimization)
  const frameDisplacement = useRef(new Vector3())
  const playerVelocity = useRef(new Vector3())
  const terrainDisplacement = useRef(new Vector3())
  const rollAxis = useRef(new Vector3())
  const worldScale = useRef(new Vector3())

  // Reusable position objects (avoid per-frame allocations)
  const nextPosition = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
  const desiredMovement = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })

  useEffect(() => {
    if (!isPlatformReady) return

    console.log('Player', { isPlatformReady, playerStatus, respawnPosition })
    if (playerStatus !== 'respawning') return
    const body = bodyRef.current
    if (!body) return
    if (!respawnPosition) {
      console.error('Trying to respawn with no respawn position.')
      return
    }

    console.warn('Player respawning at:', respawnPosition)
    body.setTranslation(
      {
        x: respawnPosition.x,
        y: respawnPosition.y,
        z: respawnPosition.z,
      },
      true,
    )

    onRespawnComplete()
  }, [isPlatformReady, playerStatus, respawnPosition, onRespawnComplete])

  useGameFrame((_, deltaTime) => {
    if (
      !bodyRef.current ||
      !controllerRef.current ||
      !ballColliderRef.current ||
      !sphereMeshRef.current ||
      !controllerRef.current
    )
      return

    const currentPosition = bodyRef.current.translation()

    // Resolve player input into a clamped direction vector
    const inputDirectionX = input.current.right - input.current.left
    const inputDirectionZ = input.current.down - input.current.up
    const platformScrollDirection = input.current.up - input.current.down
    const resolvedDirection = resolveInputDirection(inputDirectionX, inputDirectionZ)

    // Calculate desired movement including gravity
    const movement = calculateDesiredMovement(
      resolvedDirection.x,
      resolvedDirection.z,
      deltaTime,
    )

    desiredMovement.current.x = movement.x
    desiredMovement.current.y = movement.y
    desiredMovement.current.z = movement.z

    // Use character controller to compute collision-aware movement
    controllerRef.current.computeColliderMovement(
      ballColliderRef.current,
      desiredMovement.current,
      QueryFilterFlags.EXCLUDE_SENSORS,
    )

    const correctedMovement = controllerRef.current.computedMovement()

    // Platform scroll input shifts the ground underneath the player; capture that displacement
    terrainDisplacement.current.set(
      0,
      0,
      platformScrollDirection * TERRAIN_SPEED_UNITS * deltaTime,
    )

    // Apply corrected movement to kinematic rigid body
    nextPosition.current.x = currentPosition.x + correctedMovement.x
    nextPosition.current.y = currentPosition.y + correctedMovement.y
    // nextPosition.current.z =
    //   currentPosition.z + correctedMovement.z - terrainDisplacement.current.z

    bodyRef.current.setNextKinematicTranslation(nextPosition.current)

    // Calculate physics for rolling animation
    frameDisplacement.current.set(
      correctedMovement.x,
      correctedMovement.y,
      correctedMovement.z - terrainDisplacement.current.z,
    )
    const maxFrameDistance = PLAYER_MOVE_UNITS * deltaTime
    const frameDistance = frameDisplacement.current.length()
    if (frameDistance > maxFrameDistance && frameDistance > EPSILON.SMALL) {
      frameDisplacement.current.multiplyScalar(maxFrameDistance / frameDistance)
    }

    calculatePlayerVelocity(frameDisplacement.current, deltaTime, playerVelocity.current)
    playerVelocity.current.y = 0

    // Apply rolling physics to sphere mesh
    applyRollingPhysics({
      sphereMesh: sphereMeshRef.current,
      velocity: playerVelocity.current,
      deltaTime,
      worldScale: worldScale.current,
      rollAxis: rollAxis.current,
    })

    // Update global player position in store (immutable update)

    setPlayerPosition(nextPosition.current)

    // const edgeWarnings = calculateEdgeWarningIntensities(nextPosition.current)
    // setEdgeWarningIntensities(edgeWarnings)
  })

  const onIntersectionEnter: IntersectionEnterHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return

    if (otherUserData.type === 'collectible') {
      setConfirmingCollectible(otherUserData.collectibleType)
      return
    }

    if (otherUserData.type === 'out-of-bounds') {
      onOutOfBounds()
      return
    }
  }

  const onIntersectionExit: IntersectionExitHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return

    if (otherUserData.type === 'collectible') {
      setConfirmingCollectible(null)
      return
    }
  }

  if (!isPlatformReady) return null

  const userData: PlayerUserData = { type: 'player' }

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      userData={userData}
      colliders={false}
      position={PLAYER_INITIAL_POSITION}
      onIntersectionEnter={onIntersectionEnter}
      onIntersectionExit={onIntersectionExit}>
      <BallCollider
        args={[PLAYER_RADIUS]}
        ref={ballColliderRef}
        collisionGroups={COLLISION_GROUPS.player}
      />
      <Marble ref={sphereMeshRef} />
      <PlayerHUD />
    </RigidBody>
  )
}

export default Player

// Helper functions for player movement calculation
function resolveInputDirection(inputX: number, inputZ: number): { x: number; z: number } {
  const magnitude = Math.hypot(inputX, inputZ)
  if (magnitude === 0) {
    return { x: 0, z: 0 }
  }

  if (magnitude <= 1) {
    return { x: inputX, z: inputZ }
  }

  const inverseMagnitude = 1 / magnitude
  return {
    x: inputX * inverseMagnitude,
    z: inputZ * inverseMagnitude,
  }
}

function calculateDesiredMovement(
  directionX: number,
  directionZ: number,
  deltaTime: number,
): { x: number; y: number; z: number } {
  return {
    x: directionX * PLAYER_MOVE_UNITS * deltaTime,
    y: GRAVITY_ACCELERATION * deltaTime,
    z: directionZ * PLAYER_MOVE_UNITS * deltaTime,
  }
}

function calculatePlayerVelocity(
  displacement: Vector3,
  deltaTime: number,
  targetVelocity: Vector3,
): void {
  targetVelocity.copy(displacement).divideScalar(Math.max(deltaTime, EPSILON.SMALL))
}

function applyRollingPhysics({
  sphereMesh,
  velocity,
  deltaTime,
  worldScale,
  rollAxis,
}: {
  sphereMesh: Object3D
  velocity: Vector3
  deltaTime: number
  worldScale: Vector3
  rollAxis: Vector3
}): void {
  sphereMesh.getWorldScale(worldScale)
  // Assume uniform scale for a sphere
  const effectiveRadius = PLAYER_RADIUS * worldScale.x
  const speed = velocity.length()

  if (speed <= EPSILON.SMALL || effectiveRadius <= EPSILON.SMALL) return
  // Rolling without slipping: ω = (n × v) / R
  // Axis given by right-hand rule (surface normal × velocity)
  rollAxis.copy(UP_DIRECTION).cross(velocity).normalize()

  // Calculate rotation angle: θ = |v| * Δt / R
  const rotationAngle = (speed * deltaTime) / effectiveRadius
  sphereMesh.rotateOnWorldAxis(rollAxis, rotationAngle)
  sphereMesh.quaternion.normalize()
}

function calculateEdgeWarningIntensities(position: {
  x: number
  z: number
}): EdgeWarningIntensities {
  edgeWarningScratch.left = calculateUpperBoundaryIntensity(
    -position.x,
    PLATFORM_HALF_WIDTH,
    EDGE_APPROACH_MARGIN,
  )
  edgeWarningScratch.right = calculateUpperBoundaryIntensity(
    position.x,
    PLATFORM_HALF_WIDTH,
    EDGE_APPROACH_MARGIN,
  )
  edgeWarningScratch.near = calculateUpperBoundaryIntensity(
    position.z,
    ROW_RAISE_FRONT_BOUNDARY_Z,
    EDGE_APPROACH_MARGIN,
  )
  edgeWarningScratch.far = calculateLowerBoundaryIntensity(
    position.z,
    ROW_RAISE_BACK_BOUNDARY_Z,
    EDGE_APPROACH_MARGIN,
  )

  return edgeWarningScratch
}

function calculateUpperBoundaryIntensity(
  value: number,
  boundary: number,
  margin: number,
): number {
  if (value >= boundary) return 1
  if (margin <= 0) return 0

  const distance = boundary - value
  if (distance >= margin) return 0

  return 1 - distance / margin
}

function calculateLowerBoundaryIntensity(
  value: number,
  boundary: number,
  margin: number,
): number {
  if (value <= boundary) return 1
  if (margin <= 0) return 0

  const distance = value - boundary
  if (distance >= margin) return 0

  return 1 - distance / margin
}
