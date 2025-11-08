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

import { PLAYER_INITIAL_POSITION, Stage, useGameStore } from '@/components/GameProvider'
import ConfirmationBar, { PLAYER_RADIUS } from '@/components/player/ConfirmationBar'
import { useGameFrame } from '@/hooks/useGameFrame'
import usePlayerController from '@/hooks/usePlayerController'
import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'
import type { PlayerUserData, RigidBodyUserData } from '@/model/schema'
import { PLAYER_MOVE_UNITS, TERRAIN_SPEED_UNITS } from '@/resources/game'

import { Marble } from './marble/Marble'

// https://rapier.rs/docs/user_guides/javascript/rigid_bodies
// https://rapier.rs/docs/user_guides/javascript/colliders
// https://rapier.rs/docs/user_guides/javascript/character_controller/

// Physics constants
const GRAVITY_ACCELERATION = -9.81 // m/s²
const UP_DIRECTION = new Vector3(0, 1, 0)
const EPSILON = 1e-6 // Small value to prevent division by zero

const Player: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const onOutOfBounds = useGameStore((s) => s.onOutOfBounds)
  const setConfirmingColourIndex = useGameStore((s) => s.setConfirmingColourIndex)
  const setConfirmingStart = useGameStore((s) => s.setConfirmingStart)
  const setConfirmingAnswer = useGameStore((s) => s.setConfirmingAnswer)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const resetPlayerTick = useGameStore((s) => s.resetPlayerTick)

  const { terrainSpeed } = useTerrainSpeed()
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
    if (resetPlayerTick === 0) return
    const body = bodyRef.current
    if (!body) return
    // hard reset transform & motion
    body.setTranslation(
      {
        x: PLAYER_INITIAL_POSITION[0],
        y: PLAYER_INITIAL_POSITION[1],
        z: PLAYER_INITIAL_POSITION[2],
      },
      true,
    )
    body.setLinvel({ x: 0, y: 0, z: 0 }, true)
    body.setAngvel({ x: 0, y: 0, z: 0 }, true)
    body.setRotation({ x: 0, y: 0, z: 0, w: 1 }, true)
  }, [resetPlayerTick])

  useGameFrame((_, deltaTime) => {
    if (
      !bodyRef.current ||
      !controllerRef.current ||
      !ballColliderRef.current ||
      !sphereMeshRef.current ||
      !controllerRef.current
    )
      return

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
    const currentPosition = bodyRef.current.translation()

    calculateTerrainVelocity(terrainSpeed.current, terrainVelocity.current)

    // Terrain conveyor only moves along +Z/-Z, zero out lateral components to avoid drift
    terrainDisplacement.current.copy(terrainVelocity.current).multiplyScalar(deltaTime)
    terrainDisplacement.current.x = 0
    terrainDisplacement.current.y = 0

    // Apply corrected movement to kinematic rigid body
    nextPosition.current.x = currentPosition.x + correctedMovement.x
    nextPosition.current.y = currentPosition.y + correctedMovement.y
    nextPosition.current.z =
      currentPosition.z + correctedMovement.z - terrainDisplacement.current.z

    bodyRef.current.setNextKinematicTranslation(nextPosition.current)
    // Update global player position in store (immutable update)
    setPlayerPosition(nextPosition.current)

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
  })

  const onIntersectionEnter: IntersectionEnterHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return

    if (otherUserData.type === 'start') {
      if (stage !== Stage.HOME) return
      setConfirmingStart(otherUserData)
      return
    }

    if (otherUserData.type === 'answer') {
      if (stage !== Stage.QUESTION) return
      setConfirmingAnswer(otherUserData)
      return
    }

    if (otherUserData.type === 'colour') {
      if (stage !== Stage.HOME) return
      setConfirmingColourIndex(otherUserData.colourIndex)
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

    if (otherUserData.type === 'start') {
      setConfirmingStart(null)
      return
    }

    if (otherUserData.type === 'answer') {
      setConfirmingAnswer(null)
      return
    }

    if (otherUserData.type === 'colour') {
      setConfirmingColourIndex(null)
      return
    }
  }

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
      <BallCollider args={[PLAYER_RADIUS]} ref={ballColliderRef} />
      <Marble ref={sphereMeshRef} />
      <ConfirmationBar />
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
  targetVelocity.copy(displacement).divideScalar(Math.max(deltaTime, EPSILON))
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

  if (speed <= EPSILON || effectiveRadius <= EPSILON) return
  // Rolling without slipping: ω = (n × v) / R
  // Axis given by right-hand rule (surface normal × velocity)
  rollAxis.copy(UP_DIRECTION).cross(velocity).normalize()

  // Calculate rotation angle: θ = |v| * Δt / R
  const rotationAngle = (speed * deltaTime) / effectiveRadius
  sphereMesh.rotateOnWorldAxis(rollAxis, rotationAngle)
  sphereMesh.quaternion.normalize()
}
