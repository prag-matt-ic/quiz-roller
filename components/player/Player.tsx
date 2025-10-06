'use client'

import { QueryFilterFlags } from '@dimforge/rapier3d-compat'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import {
  BallCollider,
  type IntersectionEnterHandler,
  type IntersectionExitHandler,
  type RapierCollider,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import { type FC, useRef } from 'react'
import { type Mesh, Vector3 } from 'three'

import { PLAYER_INITIAL_POSITION, Stage, useGameStore } from '@/components/GameProvider'
import { TERRAIN_SPEED_UNITS } from '@/constants/game'
import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'
import type { OutOfBoundsUserData, PlayerUserData, RigidBodyUserData } from '@/model/schema'

import PlayerHUD, { PLAYER_RADIUS } from './PlayerHUD'
import fragment from './shaders/player.frag'
import vertex from './shaders/player.vert'
import usePlayerController from './usePlayerController'

// https://rapier.rs/docs/user_guides/javascript/rigid_bodies
// https://rapier.rs/docs/user_guides/javascript/colliders
// https://rapier.rs/docs/user_guides/javascript/character_controller/

type ShaderUniforms = {
  uTime: number
}
const INITIAL_UNIFORMS: ShaderUniforms = {
  uTime: 0,
}
// TODO: import .vert and .frag files
const PlayerShader = shaderMaterial(INITIAL_UNIFORMS, vertex, fragment)
const PlayerShaderMaterial = extend(PlayerShader)

const Player: FC = () => {
  const bodyRef = useRef<RapierRigidBody>(null)
  const ballColliderRef = useRef<RapierCollider | null>(null)
  const sphereMeshRef = useRef<Mesh>(null)
  const playerShaderRef = useRef<typeof PlayerShaderMaterial & ShaderUniforms>(null)
  const { terrainSpeed } = useTerrainSpeed()
  const stage = useGameStore((s) => s.stage)
  const goToStage = useGameStore((s) => s.goToStage)
  const setConfirmingAnswer = useGameStore((s) => s.setConfirmingAnswer)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)

  const { controllerRef, input } = usePlayerController()

  const MOVEMENT_SPEED = 8.5 // units per second
  const PLAYER_GRAVITY = -9.81 // m/s²
  const UP = new Vector3(0, 1, 0)
  const EPS = 1e-6

  // Player world displacement over the last frame (collision-corrected by the controller)
  const frameDisplacement = useRef(new Vector3())
  // Player velocity this frame in world units per second
  const playerVelocity = useRef(new Vector3())
  // Terrain scrolling velocity in world units per second
  const terrainVelocity = useRef(new Vector3())
  // Player velocity relative to the terrain (used for rolling)
  const relativeVelocity = useRef(new Vector3())
  // World-space axis to roll the sphere around this frame
  const rollAxis = useRef(new Vector3())
  // World-scale of the sphere mesh (used to compute effective radius)
  const worldScale = useRef(new Vector3())
  // Next kinematic translation to apply to the rigid body
  const nextPosition = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
  // Accumulated shader time uniform
  const shaderTime = useRef(0)

  useFrame((_, delta) => {
    // Always advance shader time, even during intro/game-over
    if (
      !playerShaderRef.current ||
      !bodyRef.current ||
      !controllerRef.current ||
      !ballColliderRef.current ||
      !sphereMeshRef.current
    )
      return

    shaderTime.current += delta
    playerShaderRef.current.uTime = shaderTime.current

    if (stage === Stage.SPLASH || stage === Stage.GAME_OVER) return

    // Determine intended direction on X/Z plane
    let dx = 0
    let dz = 0
    if (input.current.left) dx -= 1 // left = -X
    if (input.current.right) dx += 1 // right = +X
    if (input.current.forward) dz -= 1 // forward = -Z
    if (input.current.backward) dz += 1 // backward = +Z

    // Normalize to keep diagonal speed consistent
    const len = Math.hypot(dx, dz)
    if (len > 0) {
      dx /= len
      dz /= len
    }

    // Include gravity in the desired movement
    const desiredTranslationDelta = {
      x: dx * MOVEMENT_SPEED * delta,
      y: PLAYER_GRAVITY * delta,
      z: dz * MOVEMENT_SPEED * delta,
    }

    // Use character controller to compute collision-aware movement
    // Note: Need to allow kinematic-kinematic collisions for terrain
    controllerRef.current.computeColliderMovement(
      ballColliderRef.current,
      desiredTranslationDelta,
      QueryFilterFlags.EXCLUDE_SENSORS,
    )
    const correctedMovement = controllerRef.current.computedMovement()

    // Apply the corrected movement to the kinematic rigid body
    const currentPosition = bodyRef.current.translation()

    // The character controller returns the actual movement we should apply
    // NOT the final position, so we need to add it to current position
    nextPosition.current.x = currentPosition.x + correctedMovement.x
    nextPosition.current.y = currentPosition.y + correctedMovement.y
    nextPosition.current.z = currentPosition.z + correctedMovement.z

    bodyRef.current.setNextKinematicTranslation(nextPosition.current)

    // Update global playerPosition in store (immutable update)
    // Note: use a fresh object to adhere to immutability rules
    setPlayerPosition({
      x: nextPosition.current.x,
      y: nextPosition.current.y,
      z: nextPosition.current.z,
    })

    // Player world displacement this frame (already collision-corrected)
    frameDisplacement.current.set(correctedMovement.x, correctedMovement.y, correctedMovement.z)

    // Convert displacement to velocity (units / second)
    playerVelocity.current.copy(frameDisplacement.current).divideScalar(Math.max(delta, EPS))

    // Terrain scroll velocity (scale normalized speed by base units).
    // Convention: "forward" is -Z in your input mapping,
    // so terrain moving forward at `terrainSpeed` means the ground flows toward +Z
    // and the ball's relative forward velocity is -terrainSpeed on Z.
    const terrainSpeedUnits = terrainSpeed.current * TERRAIN_SPEED_UNITS
    terrainVelocity.current.set(0, 0, -terrainSpeedUnits)

    // Relative velocity of ball w.r.t. ground on the contact plane
    relativeVelocity.current.copy(playerVelocity.current).add(terrainVelocity.current)
    relativeVelocity.current.y = 0 // constrain to surface plane (assumes flat ground)

    if (input.current.backward && Math.abs(terrainSpeedUnits) > EPS) {
      // treat ball as static relative to ground: no rolling
      relativeVelocity.current.set(0, 0, 0)
    }

    // compute effective world-space radius (handles parent/mesh scaling)
    sphereMeshRef.current.getWorldScale(worldScale.current)
    // assume uniform scale for a sphere; if not uniform, pick the contact-plane scale
    const effectiveRadius = PLAYER_RADIUS * worldScale.current.x

    const speed = relativeVelocity.current.length()
    if (speed > EPS && effectiveRadius > EPS) {
      // 0.000001 to avoid NaN
      // --- Rolling without slipping: ω = (n × v) / R ---
      // Axis given by right-hand rule (surface normal × velocity)
      rollAxis.current.copy(UP).cross(relativeVelocity.current).normalize()

      // Angle this frame: θ = |v| * Δt / R  (scaled if you want)
      // const angle = (speed * delta * ROLLING_SPEED_MULTIPLIER) / PLAYER_RADIUS
      const angle = (speed * delta) / effectiveRadius

      sphereMeshRef.current.rotateOnWorldAxis(rollAxis.current, angle)
      sphereMeshRef.current.quaternion.normalize()
    }
  })

  const onIntersectionEnter: IntersectionEnterHandler = (e) => {
    const otherUserData = e.other.rigidBodyObject?.userData as RigidBodyUserData

    if (!otherUserData) return
    if (otherUserData.type === 'answer') {
      if (stage !== Stage.QUESTION) return // only allow during question stage
      setConfirmingAnswer(otherUserData)
      return
    }

    if (otherUserData.type === 'out-of-bounds') {
      goToStage(Stage.GAME_OVER)
      return
    }
  }

  const onIntersectionExit: IntersectionExitHandler = (e) => {
    const otherUserData = e.other.rigidBodyObject?.userData as RigidBodyUserData
    // console.debug("Player INTERSECTION EXIT with", otherUserData, e);
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
      <mesh ref={sphereMeshRef}>
        <sphereGeometry args={[PLAYER_RADIUS, 24, 24]} />
        <PlayerShaderMaterial
          key={PlayerShader.key}
          ref={playerShaderRef}
          uTime={INITIAL_UNIFORMS.uTime}
          transparent={false}
          depthWrite={true}
        />
      </mesh>
      <PlayerHUD />
    </RigidBody>
  )
}

export default Player
