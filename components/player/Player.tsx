'use client'

import { KinematicCharacterController, QueryFilterFlags } from '@dimforge/rapier3d-compat'
import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import {
  BallCollider,
  type IntersectionEnterHandler,
  type IntersectionExitHandler,
  type RapierCollider,
  RapierRigidBody,
  RigidBody,
  useRapier,
} from '@react-three/rapier'
import { type FC, Suspense, useEffect, useLayoutEffect, useRef } from 'react'
import { type Mesh, Vector3 } from 'three'

import playerTexture from '@/assets/player-texture.png'
import { Stage, useGameStore, useGameStoreAPI } from '@/components/GameProvider'
import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'
import type { PlayerUserData, RigidBodyUserData } from '@/model/schema'

import PlayerHUD, { PLAYER_RADIUS } from './PlayerHUD'

// https://rapier.rs/docs/user_guides/javascript/rigid_bodies
// https://rapier.rs/docs/user_guides/javascript/colliders
// https://rapier.rs/docs/user_guides/javascript/character_controller/

const Player: FC = () => {
  const colorMap = useTexture(playerTexture.src)
  const bodyRef = useRef<RapierRigidBody>(null)
  const ballColliderRef = useRef<RapierCollider | null>(null)
  const sphereMeshRef = useRef<Mesh>(null)
  const { terrainSpeed } = useTerrainSpeed()
  const stage = useGameStore((s) => s.stage)
  const setConfirmingAnswer = useGameStore((s) => s.setConfirmingAnswer)
  const setPlayerPosition = useGameStore((s) => s.setPlayerPosition)

  // Multiplier to adjust rolling speed visually (tweak for aesthetics)
  const ROLLING_SPEED_MULTIPLIER = 0.8

  const { controllerRef, input } = usePlayerController()

  const MOVEMENT_SPEED = 6.5 // units per second
  const PLAYER_GRAVITY = -9.81 // m/s²
  const UP = new Vector3(0, 1, 0)
  const EPS = 1e-6

  const dispRef = useRef(new Vector3())
  const vPlayerRef = useRef(new Vector3())
  const vTerrainRef = useRef(new Vector3())
  const vRelRef = useRef(new Vector3())
  const axisRef = useRef(new Vector3())
  const worldScaleRef = useRef(new Vector3())
  const nextPosRef = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })

  useFrame((_, delta) => {
    if (
      !bodyRef.current ||
      !controllerRef.current ||
      !ballColliderRef.current ||
      !sphereMeshRef.current
    )
      return

    if (stage === Stage.INTRO || stage === Stage.GAME_OVER) return

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
    nextPosRef.current.x = currentPosition.x + correctedMovement.x
    nextPosRef.current.y = currentPosition.y + correctedMovement.y
    nextPosRef.current.z = currentPosition.z + correctedMovement.z

    bodyRef.current.setNextKinematicTranslation(nextPosRef.current)

    // Update global playerPosition in store (immutable update)
    // Note: use a fresh object to adhere to immutability rules
    setPlayerPosition({
      x: nextPosRef.current.x,
      y: nextPosRef.current.y,
      z: nextPosRef.current.z,
    })

    // Player world displacement this frame (already collision-corrected)
    dispRef.current.set(correctedMovement.x, correctedMovement.y, correctedMovement.z)

    // Convert displacement to velocity (units / second)
    vPlayerRef.current.copy(dispRef.current).divideScalar(Math.max(delta, EPS))

    // Terrain scroll velocity.
    // Convention: "forward" is -Z in your input mapping,
    // so terrain moving forward at `terrainSpeed` means the ground flows toward +Z
    // and the ball's relative forward velocity is -terrainSpeed on Z.
    vTerrainRef.current.set(0, 0, -terrainSpeed.current)

    // Relative velocity of ball w.r.t. ground on the contact plane
    vRelRef.current.copy(vPlayerRef.current).add(vTerrainRef.current)
    vRelRef.current.y = 0 // constrain to surface plane (assumes flat ground)

    if (input.current.backward && Math.abs(terrainSpeed.current) > EPS) {
      // treat ball as static relative to ground: no rolling
      vRelRef.current.set(0, 0, 0)
    }

    // compute effective world-space radius (handles parent/mesh scaling)
    sphereMeshRef.current.getWorldScale(worldScaleRef.current)
    // assume uniform scale for a sphere; if not uniform, pick the contact-plane scale
    const effectiveRadius = PLAYER_RADIUS * worldScaleRef.current.x

    const speed = vRelRef.current.length()
    if (speed > EPS && effectiveRadius > EPS) {
      // 0.000001 to avoid NaN
      // --- Rolling without slipping: ω = (n × v) / R ---
      // Axis given by right-hand rule (surface normal × velocity)
      axisRef.current.copy(UP).cross(vRelRef.current).normalize()

      // Angle this frame: θ = |v| * Δt / R  (scaled if you want)
      // const angle = (speed * delta * ROLLING_SPEED_MULTIPLIER) / PLAYER_RADIUS
      const angle = (speed * delta) / effectiveRadius

      sphereMeshRef.current.rotateOnWorldAxis(axisRef.current, angle)
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

    // if (otherUserData.type === 'ground') {
    //   onGameOver(OutOfBoundsUserData.ground)
    //   return
    // }
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
      restitution={0}
      colliders={false}
      position={[0, 2.5, 0]}
      onIntersectionEnter={onIntersectionEnter}
      onIntersectionExit={onIntersectionExit}>
      <BallCollider args={[PLAYER_RADIUS]} ref={ballColliderRef} />
      <Suspense>
        <mesh ref={sphereMeshRef}>
          <sphereGeometry args={[PLAYER_RADIUS, 24, 24]} />
          <meshLambertMaterial map={colorMap} />
        </mesh>
      </Suspense>
      <PlayerHUD />
    </RigidBody>
  )
}

export default Player

type Input = {
  forward: boolean
  backward: boolean
  left: boolean
  right: boolean
}

function usePlayerController() {
  const { world } = useRapier()
  const controllerRef = useRef<KinematicCharacterController | null>(null)

  useLayoutEffect(() => {
    if (!world) return
    if (!!controllerRef.current) return // already created

    function setupController() {
      const controller = world.createCharacterController(0.01)

      // Enable auto-stepping over small obstacles (like terrain gaps)
      controller.enableAutostep(0.5, 0.2, true)

      // Enable snap-to-ground to stick to terrain surfaces
      controller.enableSnapToGround(0.5)

      // Set up vector (positive Y axis)
      controller.setUp({ x: 0.0, y: 1.0, z: 0.0 })

      // Configure slope handling
      controller.setMaxSlopeClimbAngle((45 * Math.PI) / 180) // 45 degrees max climb
      controller.setMinSlopeSlideAngle((30 * Math.PI) / 180) // 30 degrees min slide

      // Allow interaction with dynamic bodies
      controller.setApplyImpulsesToDynamicBodies(true)

      controllerRef.current = controller
    }

    setupController()
  }, [world])

  // Track pressed movement intents in a ref to avoid re-renders
  const input = useRef<Input>({
    forward: false,
    backward: false,
    left: false,
    right: false,
  })

  // Keyboard listeners (WASD + Arrow keys). Up/Down -> Z axis, Left/Right -> X axis.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          input.current.forward = true
          break
        case 'ArrowDown':
        case 'KeyS':
          input.current.backward = true
          break
        case 'ArrowLeft':
        case 'KeyA':
          input.current.left = true
          break
        case 'ArrowRight':
        case 'KeyD':
          input.current.right = true
          break
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'ArrowUp':
        case 'KeyW':
          input.current.forward = false
          break
        case 'ArrowDown':
        case 'KeyS':
          input.current.backward = false
          break
        case 'ArrowLeft':
        case 'KeyA':
          input.current.left = false
          break
        case 'ArrowRight':
        case 'KeyD':
          input.current.right = false
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  return { controllerRef, input }
}
