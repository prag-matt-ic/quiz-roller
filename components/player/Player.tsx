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
  useGameStoreAPI,
} from '@/components/GameProvider'
import PlayerHUD, { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { useGameFrame } from '@/hooks/useGameFrame'
import usePlayerController from '@/hooks/usePlayerController'
import type { PlayerUserData, RigidBodyUserData } from '@/model/schema'
import {
  COLUMNS,
  ENTRY_END_Z,
  EXIT_START_Z,
  TILE_SIZE,
  EPSILON,
  PLAYER_MOVE_UNITS,
  TERRAIN_SPEED_UNITS,
  SAFE_HEIGHT,
  colToX,
} from '@/utils/tiles'
import { Marble } from '@/components/player/marble/Marble'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'

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
  const setEdgeWarningIntensities = useGameStore((s) => s.setEdgeWarningIntensities)

  const respawnPlayerTick = useGameStore((s) => s.respawnPlayerTick)
  const setIsRespawning = useGameStore((s) => s.setIsRespawning)
  const setConfirmingCollectible = useGameStore((s) => s.setConfirmingCollectible)
  const isPlatformReady = useGameStore((s) => s.isPlatformReady)
  const respawnPlayer = useGameStore((s) => s.respawnPlayer)
  const gameStoreAPI = useGameStoreAPI()

  const { controllerRef, input } = usePlayerController()

  // Refs for physics bodies and meshes
  const bodyRef = useRef<RapierRigidBody>(null)
  const ballColliderRef = useRef<RapierCollider | null>(null)
  const sphereMeshRef = useRef<Mesh>(null)

  // Preallocated vectors for physics calculations (performance optimization)
  const frameDisplacement = useRef(new Vector3())
  const playerVelocity = useRef(new Vector3())
  const terrainVelocity = useRef(new Vector3())
  const terrainDisplacement = useRef(new Vector3())
  const rollAxis = useRef(new Vector3())
  const worldScale = useRef(new Vector3())

  // Reusable position objects (avoid per-frame allocations)
  const nextPosition = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
  const desiredMovement = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })

  useEffect(() => {
    if (!isPlatformReady) return
    if (respawnPlayerTick === 0) return
    const body = bodyRef.current
    if (!body) return

    function calculateSafeXForPlayerReset(): number {
      const state = gameStoreAPI.getState()
      const { rowsData, currentRow } = state

      if (!rowsData.length) {
        return PLAYER_INITIAL_POSITION[0]
      }

      const clampedRowIndex = Math.min(
        Math.max(currentRow, 0),
        Math.max(rowsData.length - 1, 0),
      )
      const rowData = rowsData[clampedRowIndex]
      if (!rowData || !rowData.heights?.length) {
        return PLAYER_INITIAL_POSITION[0]
      }

      const availableColumns = Math.min(rowData.heights.length, COLUMNS)
      if (availableColumns <= 0) {
        return PLAYER_INITIAL_POSITION[0]
      }

      const maxColumnIndex = availableColumns - 1

      let preferredColumn = 0
      let smallestAbsX = Infinity
      for (let columnIndex = 0; columnIndex < availableColumns; columnIndex++) {
        const columnX = colToX(columnIndex)
        const absX = Math.abs(columnX)
        if (absX < smallestAbsX) {
          smallestAbsX = absX
          preferredColumn = columnIndex
        }
      }

      const isColumnRaised = (columnIndex: number) => {
        const height = rowData.heights[columnIndex]
        return typeof height === 'number' && height >= SAFE_HEIGHT - EPSILON.TINY
      }

      if (isColumnRaised(preferredColumn)) {
        return colToX(preferredColumn)
      }

      for (let offset = 1; offset <= maxColumnIndex; offset++) {
        const leftColumn = preferredColumn - offset
        if (leftColumn >= 0 && isColumnRaised(leftColumn)) {
          return colToX(leftColumn)
        }

        const rightColumn = preferredColumn + offset
        if (rightColumn <= maxColumnIndex && isColumnRaised(rightColumn)) {
          return colToX(rightColumn)
        }
      }

      return PLAYER_INITIAL_POSITION[0]
    }

    // Reset position, player drops in from Y height to land on the surface.
    body.setTranslation(
      {
        x: calculateSafeXForPlayerReset(),
        y: PLAYER_INITIAL_POSITION[1],
        z: PLAYER_INITIAL_POSITION[2],
      },
      true,
    )

    const clearRespawnTimeout = setTimeout(() => {
      setIsRespawning(false)
    }, 420)

    return () => clearTimeout(clearRespawnTimeout)
  }, [gameStoreAPI, isPlatformReady, respawnPlayerTick, setIsRespawning])

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

    // if (currentPosition.y > 1.0 ) return

    // Resolve player input into a clamped direction vector
    const inputDirectionX = input.current.right - input.current.left
    const inputDirectionZ = input.current.down - input.current.up
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

    // TODO: simplify this now that the terrain/platform moves in sync with the player
    calculateTerrainVelocity(0, terrainVelocity.current)

    // Terrain conveyor only moves along +Z/-Z, zero out lateral components to avoid drift
    terrainDisplacement.current.copy(terrainVelocity.current).multiplyScalar(deltaTime)
    terrainDisplacement.current.x = 0
    terrainDisplacement.current.y = 0

    // Apply corrected movement to kinematic rigid body
    nextPosition.current.x = currentPosition.x + correctedMovement.x
    nextPosition.current.y = currentPosition.y + correctedMovement.y
    // nextPosition.current.z =
    //   currentPosition.z + correctedMovement.z - terrainDisplacement.current.z

    bodyRef.current.setNextKinematicTranslation(nextPosition.current)

    // Calculate physics for rolling animation
    frameDisplacement.current.set(correctedMovement.x, correctedMovement.y, correctedMovement.z)

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

    const edgeWarnings = calculateEdgeWarningIntensities(nextPosition.current)
    setEdgeWarningIntensities(edgeWarnings)
  })

  useEffect(() => {
    // Handle initial player respawn
    if (!isPlatformReady) return
    if (respawnPlayerTick !== 0) return
    respawnPlayer()
  }, [isPlatformReady, respawnPlayer, respawnPlayerTick])

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

  const userData: PlayerUserData = { type: 'player' }

  if (!isPlatformReady) {
    return null
  }

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

function calculateTerrainVelocity(
  terrainSpeedNormalized: number,
  targetVelocity: Vector3,
): void {
  const terrainSpeedUnits = terrainSpeedNormalized * TERRAIN_SPEED_UNITS
  // Terrain moving forward means ground flows toward +Z
  targetVelocity.set(0, 0, -terrainSpeedUnits)
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
