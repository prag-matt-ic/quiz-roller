'use client'

import { QueryFilterFlags } from '@dimforge/rapier3d-compat'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import {
  BallCollider,
  type IntersectionEnterHandler,
  type IntersectionExitHandler,
  type RapierCollider,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import { type FC, forwardRef, type RefObject, useRef } from 'react'
import { type Mesh, Vector3 } from 'three'

import { PLAYER_INITIAL_POSITION, Stage, useGameStore } from '@/components/GameProvider'
import PlayerHUD, { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import fragment from '@/components/player/shaders/player.frag'
import vertex from '@/components/player/shaders/player.vert'
import usePlayerController from '@/components/player/usePlayerController'
import { PLAYER_MOVE_UNITS, TERRAIN_SPEED_UNITS } from '@/constants/game'
import { useGameFrame } from '@/hooks/useGameFrame'
import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'
import type { PlayerUserData, RigidBodyUserData } from '@/model/schema'

// https://rapier.rs/docs/user_guides/javascript/rigid_bodies
// https://rapier.rs/docs/user_guides/javascript/colliders
// https://rapier.rs/docs/user_guides/javascript/character_controller/

// Physics constants
const GRAVITY_ACCELERATION = -9.81 // m/s²
const UP_DIRECTION = new Vector3(0, 1, 0)
const EPSILON = 1e-6 // Small value to prevent division by zero

// Shader configuration
type ShaderUniforms = {
  uTime: number
}

const INITIAL_UNIFORMS: ShaderUniforms = {
  uTime: 0,
}

const PlayerShader = shaderMaterial(INITIAL_UNIFORMS, vertex, fragment)
const PlayerShaderMaterial = extend(PlayerShader)

const Player: FC = () => {
  const { terrainSpeed } = useTerrainSpeed()
  const stage = useGameStore((s) => s.stage)
  const goToStage = useGameStore((s) => s.goToStage)
  const setConfirmingAnswer = useGameStore((s) => s.setConfirmingAnswer)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)
  const { controllerRef, input } = usePlayerController()

  // Refs for physics bodies and meshes
  const bodyRef = useRef<RapierRigidBody>(null)
  const ballColliderRef = useRef<RapierCollider | null>(null)
  const sphereMeshRef = useRef<Mesh>(null)
  const playerShaderRef = useRef<typeof PlayerShaderMaterial & ShaderUniforms>(null)

  // Preallocated vectors for physics calculations (performance optimization)
  const frameDisplacement = useRef(new Vector3())
  const playerVelocity = useRef(new Vector3())
  const terrainVelocity = useRef(new Vector3())
  const relativeVelocity = useRef(new Vector3())
  const rollAxis = useRef(new Vector3())
  const worldScale = useRef(new Vector3())

  // Reusable position objects (avoid per-frame allocations)
  const nextPosition = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
  const desiredMovement = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })

  // Shader time accumulator
  const shaderTime = useRef(0)

  useGameFrame((_, deltaTime) => {
    if (
      !playerShaderRef.current ||
      !bodyRef.current ||
      !controllerRef.current ||
      !ballColliderRef.current ||
      !sphereMeshRef.current
    )
      return

    // Update shader animation time
    shaderTime.current += deltaTime
    playerShaderRef.current.uTime = shaderTime.current

    // Don't update during splash screen
    if (stage === Stage.SPLASH) return

    // Get player input and normalize direction
    const inputDirectionX = (input.current.right ? 1 : 0) - (input.current.left ? 1 : 0)
    const inputDirectionZ = (input.current.backward ? 1 : 0) - (input.current.forward ? 1 : 0)
    const normalizedDirection = normalizeInputDirection(inputDirectionX, inputDirectionZ)

    // Calculate desired movement including gravity
    const movement = calculateDesiredMovement(
      normalizedDirection.x,
      normalizedDirection.z,
      deltaTime,
    )

    desiredMovement.current.x = movement.x
    desiredMovement.current.y = movement.y
    desiredMovement.current.z = movement.z

    // Use character controller to compute collision-aware movement
    controllerRef.current.computeColliderMovement(
      ballColliderRef.current,
      desiredMovement.current,
      QueryFilterFlags.ONLY_FIXED,
    )

    const correctedMovement = controllerRef.current.computedMovement()
    const currentPosition = bodyRef.current.translation()
    // Apply corrected movement to kinematic rigid body
    nextPosition.current.x = currentPosition.x + correctedMovement.x
    nextPosition.current.y = currentPosition.y + correctedMovement.y
    nextPosition.current.z = currentPosition.z + correctedMovement.z

    bodyRef.current.setNextKinematicTranslation(nextPosition.current)
    // Update global player position in store (immutable update)
    setPlayerPosition({
      x: nextPosition.current.x,
      y: nextPosition.current.y,
      z: nextPosition.current.z,
    })

    // Calculate physics for rolling animation
    frameDisplacement.current.set(correctedMovement.x, correctedMovement.y, correctedMovement.z)

    calculatePlayerVelocity(frameDisplacement.current, deltaTime, playerVelocity.current)
    calculateTerrainVelocity(terrainSpeed.current, terrainVelocity.current)
    calculateRelativeVelocity(
      playerVelocity.current,
      terrainVelocity.current,
      relativeVelocity.current,
    )

    // Apply rolling physics to sphere mesh
    applyRollingPhysics({
      sphereMesh: sphereMeshRef.current,
      relativeVelocity: relativeVelocity.current,
      deltaTime,
      worldScale: worldScale.current,
      rollAxis: rollAxis.current,
    })
  })

  const onIntersectionEnter: IntersectionEnterHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData

    if (!otherUserData) return

    if (otherUserData.type === 'answer') {
      if (stage !== Stage.QUESTION) return
      setConfirmingAnswer(otherUserData)
      return
    }

    if (otherUserData.type === 'out-of-bounds') {
      goToStage(Stage.GAME_OVER)
      return
    }
  }

  const onIntersectionExit: IntersectionExitHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData

    if (!otherUserData) return

    if (otherUserData.type === 'answer') {
      setConfirmingAnswer(null)
    }
  }

  const userData: PlayerUserData = { type: 'player' }

  return (
    <RigidBody
      ref={bodyRef}
      type="kinematicPosition"
      userData={userData}
      restitution={1}
      colliders={false}
      position={PLAYER_INITIAL_POSITION}
      onIntersectionEnter={onIntersectionEnter}
      onIntersectionExit={onIntersectionExit}>
      <BallCollider args={[PLAYER_RADIUS]} ref={ballColliderRef} />
      <Marble ref={sphereMeshRef} playerShaderRef={playerShaderRef} />
      <PlayerHUD />
    </RigidBody>
  )
}

export default Player

// Helper functions for player movement calculation
function normalizeInputDirection(inputX: number, inputZ: number): { x: number; z: number } {
  const magnitude = Math.hypot(inputX, inputZ)
  if (magnitude === 0) return { x: 0, z: 0 }
  return {
    x: inputX / magnitude,
    z: inputZ / magnitude,
  }
}

function calculateDesiredMovement(
  normalizedDirectionX: number,
  normalizedDirectionZ: number,
  deltaTime: number,
): { x: number; y: number; z: number } {
  return {
    x: normalizedDirectionX * PLAYER_MOVE_UNITS * deltaTime,
    y: GRAVITY_ACCELERATION * deltaTime,
    z: normalizedDirectionZ * PLAYER_MOVE_UNITS * deltaTime,
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

function calculateRelativeVelocity(
  playerVelocity: Vector3,
  terrainVelocity: Vector3,
  targetVelocity: Vector3,
): void {
  targetVelocity.copy(playerVelocity).add(terrainVelocity)
  targetVelocity.y = 0 // Constrain to surface plane (assumes flat ground)
}

function applyRollingPhysics({
  sphereMesh,
  relativeVelocity,
  deltaTime,
  worldScale,
  rollAxis,
}: {
  sphereMesh: Mesh
  relativeVelocity: Vector3
  deltaTime: number
  worldScale: Vector3
  rollAxis: Vector3
}): void {
  sphereMesh.getWorldScale(worldScale)
  // Assume uniform scale for a sphere
  const effectiveRadius = PLAYER_RADIUS * worldScale.x
  const speed = relativeVelocity.length()

  if (speed <= EPSILON || effectiveRadius <= EPSILON) return
  // Rolling without slipping: ω = (n × v) / R
  // Axis given by right-hand rule (surface normal × velocity)
  rollAxis.copy(UP_DIRECTION).cross(relativeVelocity).normalize()

  // Calculate rotation angle: θ = |v| * Δt / R
  const rotationAngle = (speed * deltaTime) / effectiveRadius
  sphereMesh.rotateOnWorldAxis(rollAxis, rotationAngle)
  sphereMesh.quaternion.normalize()
}

export const Marble = forwardRef(
  (
    props: {
      playerShaderRef: RefObject<(typeof PlayerShaderMaterial & ShaderUniforms) | null>
    },
    ref,
  ) => {
    return (
      <mesh ref={ref}>
        <sphereGeometry args={[PLAYER_RADIUS, 32, 32]} />
        <PlayerShaderMaterial
          key={PlayerShader.key}
          ref={props.playerShaderRef}
          uTime={INITIAL_UNIFORMS.uTime}
          transparent={false}
          depthWrite={true}
        />
      </mesh>
    )
  },
)

Marble.displayName = 'Marble'
