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
import type { PlayerUserData, RigidBodyUserData } from '@/model/schema'

import { useGameStore } from '../GameProvider'
import PlayerHUD, { PLAYER_RADIUS } from './PlayerHUD'

// https://rapier.rs/docs/user_guides/javascript/rigid_bodies
// https://rapier.rs/docs/user_guides/javascript/colliders
// https://rapier.rs/docs/user_guides/javascript/character_controller/

const Player: FC = () => {
  const colorMap = useTexture(playerTexture.src)
  const bodyRef = useRef<RapierRigidBody>(null)
  const ballColliderRef = useRef<RapierCollider | null>(null)
  const sphereMeshRef = useRef<Mesh>(null)
  const rotationAxis = useRef(new Vector3(0, 0, 0))

  const { controllerRef, input } = usePlayerController()

  const MOVEMENT_SPEED = 6.5 // units per second
  const PLAYER_GRAVITY = -9.81 // m/s²

  useFrame((_, delta) => {
    if (
      !bodyRef.current ||
      !controllerRef.current ||
      !ballColliderRef.current ||
      !sphereMeshRef.current
    )
      return

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

    const desiredTranslationDelta = {
      x: dx * MOVEMENT_SPEED * delta,
      y: PLAYER_GRAVITY * delta,
      z: dz * MOVEMENT_SPEED * delta,
    }

    controllerRef.current.computeColliderMovement(
      ballColliderRef.current,
      desiredTranslationDelta,
      QueryFilterFlags.EXCLUDE_SENSORS, //| QueryFilterFlags.EXCLUDE_KINEMATIC,
    )
    const corrected = controllerRef.current.computedMovement()

    const t = bodyRef.current.translation()
    const next = {
      x: t.x + corrected.x,
      y: t.y + corrected.y,
      z: t.z + corrected.z,
    }
    bodyRef.current.setNextKinematicTranslation(next)

    if (corrected.x === 0 && corrected.z === 0) return

    // Rolling axis is perpendicular to velocity on the ground plane (world space).
    // Use world-space rotation to avoid compounding local-axis drift when changing directions.
    rotationAxis.current.set(corrected.z, 0, -corrected.x)
    if (rotationAxis.current.lengthSq() === 0) return
    rotationAxis.current.normalize()
    // Visual rolling of the sphere (purely cosmetic).
    const dist = Math.hypot(corrected.x, corrected.z)
    const rollAngle = dist / PLAYER_RADIUS // angle = arc length / radius
    sphereMeshRef.current.rotateOnWorldAxis(rotationAxis.current, rollAngle)
    // Keep quaternion well-conditioned over time.
    sphereMeshRef.current.quaternion.normalize()
  })

  const setConfirmingAnswer = useGameStore((state) => state.setConfirmingAnswer)
  const setConfirmingTopic = useGameStore((state) => state.setConfirmingTopic)

  const onIntersectionEnter: IntersectionEnterHandler = (e) => {
    console.log('Player INTERSECTION ENTER with', e)
    const otherUserData = e.other.rigidBodyObject?.userData as RigidBodyUserData

    if (!otherUserData) return

    if (otherUserData.type === 'answer') {
      setConfirmingAnswer(otherUserData.answer)
      return
    }

    if (otherUserData.type === 'topic') {
      setConfirmingTopic(otherUserData.topic)
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
    if (otherUserData.type === 'topic') {
      setConfirmingTopic(null)
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
      position={[0, PLAYER_RADIUS * 2.0, 0]}
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
      // Autostep to allow stepping on dynamic bodies.
      controller.enableAutostep(0.2, PLAYER_RADIUS, true)
      // Snap to the ground if the vertical distance to the ground is smaller than 0.2.
      controller.enableSnapToGround(0.5)
      // Allow some interaction with dynamic bodies we might hit.
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
