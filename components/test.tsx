'use client'

import { KinematicCharacterController, QueryFilterFlags } from '@dimforge/rapier3d-compat'
import { OrbitControls } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  type InstancedRigidBodyProps,
  Physics,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import {
  BallCollider,
  type IntersectionEnterHandler,
  type IntersectionExitHandler,
  type RapierCollider,
  useRapier,
} from '@react-three/rapier'
import { type FC, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import React from 'react'
// import the noise functions you need
import { createNoise2D } from 'simplex-noise'
import * as THREE from 'three'
// import { createNoise3D } from 'simplex-noise'

function TestingPage() {
  return (
    <>
      <Canvas
        className="!fixed inset-0 !h-lvh"
        performance={{ min: 0.2, debounce: 300 }}
        gl={{
          antialias: false,
          alpha: false,
        }}
        camera={{ position: [0, 8, 4], fov: 65, far: 100 }}>
        <Suspense fallback={null}>
          <ambientLight intensity={2} />
          <pointLight position={[5, 5, 0]} />
          <OrbitControls makeDefault={true} />

          <Physics debug={true}>
            <Terrain />
            {/* <Ball /> */}
            <Player />
          </Physics>
        </Suspense>
      </Canvas>
    </>
  )
}

export default TestingPage

const PLAYER_RADIUS = 0.2

// Grid configuration
const COLUMNS = 16
const ROWS = 24
const BOX_SIZE = 1
const BOX_SPACING = 1
const TERRAIN_SPEED = 6

const Terrain: FC = () => {
  const rigidBodies = useRef<RapierRigidBody[]>(null)
  const [terrainInstances, setTerrainInstances] = useState<InstancedRigidBodyProps[]>([])
  const isSetup = useRef(false)

  // 3D Noise configuration
  const noise3D = useRef(createNoise2D())
  const HEIGHT_MULTIPLIER = 1 // Multiply noise values to increase height variation
  const PLATFORM_THRESHOLD = 0.3 // Heights above this become solid blocks

  // Pre-generated noise data
  const NOISE_DATA_ROWS = 256
  const noiseData = useRef<number[][]>([]) // [row][col] = height
  const nextDataIndex = useRef(0) // Current row index in the noise data

  // Conveyor belt state
  const zOffset = useRef(0) // Track how far the terrain has moved

  // ---------- Inside Terrain.useEffect() ----------
  useEffect(() => {
    if (isSetup.current) return

    // Generate a guaranteed-safe corridor batch of 256 rows
    const batch = generateObstacleHeights({
      rows: NOISE_DATA_ROWS, // 256
      cols: COLUMNS, // 12
      minWidth: 3, // start easy at 4 → 3 later if you like
      maxWidth: 4,
      movePerRow: 1, // player can shift 1 col per row at current speed
      freq: 0.2, // wiggle; raise with difficulty
      notchChance: 0.1, // occasional nibble at corridor edge
      openHeight: 2, // offscreen "empty"
      blockedHeight: -16, // visible obstacle
    })

    noiseData.current = batch

    // Generate initial instances starting from z=0 and extending backward
    const instances: InstancedRigidBodyProps[] = []
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const x = (col - COLUMNS / 2 + 0.5) * BOX_SPACING
        const z = -row * BOX_SPACING // Start from z=0 and go backward
        const y = noiseData.current[row][col]
        instances.push({
          key: `terrain-${row}-${col}`,
          position: [x, y, z],
          userData: { type: 'terrain', rowIndex: row, colIndex: col },
        })
      }
    }

    setTerrainInstances(instances)
    nextDataIndex.current = ROWS // Start sampling from row 24 onwards
    isSetup.current = true
  }, [])

  useFrame(() => {
    if (!rigidBodies.current) return

    // zOffset.current += TERRAIN_SPEED * (1 / 60)

    // Move all terrain boxes forward and recycle when they pass behind
    rigidBodies.current.forEach((body, index) => {
      if (!body) return

      const position = body.translation()

      // If box has moved too far forward, recycle it to the back
      if (position.z > 5) {
        // Reduced threshold since we start from z=0
        const col = index % COLUMNS
        const x = (col - COLUMNS / 2 + 0.5) * BOX_SPACING
        const newZ = position.z - ROWS * BOX_SPACING

        // Sample from pre-generated noise data or use flat terrain
        let y = 0
        if (nextDataIndex.current < NOISE_DATA_ROWS) {
          y = noiseData.current[nextDataIndex.current][col]
        }
        // If we've used all 256 rows, y remains 0 (flat)

        body.setTranslation({ x, y, z: newZ }, true)
        // Set continuous forward velocity
        // body.setLinvel({ x: 0, y: 0, z: TERRAIN_SPEED }, true)

        // Advance to next row when we've processed all columns of current row
        if (col === COLUMNS - 1) {
          nextDataIndex.current++
        }
      }
    })
  })

  if (!terrainInstances.length) return null

  return (
    <group rotation={[0, 0, 0]}>
      <InstancedRigidBodies
        ref={rigidBodies}
        instances={terrainInstances}
        type="kinematicVelocity"
        canSleep={false}
        sensor={false}
        colliders="cuboid"
        restitution={0.3}
        linearVelocity={[0, 0, TERRAIN_SPEED]}
        friction={0}>
        <instancedMesh
          args={[undefined, undefined, terrainInstances.length]}
          count={terrainInstances.length}>
          <boxGeometry args={[BOX_SIZE, BOX_SIZE, BOX_SIZE]} />
          <meshStandardMaterial
            color="grey"
            wireframe={false}
            transparent={true}
            opacity={0.5}
          />
        </instancedMesh>
      </InstancedRigidBodies>
    </group>
  )
}

// ---------- Helper (place above Terrain component) ----------

type ObstacleParams = {
  rows: number // e.g. 256
  cols: number // e.g. 12
  seed?: number // deterministic if you want; defaults Math.random()
  minWidth: number // minimum open corridor width (>=1)
  maxWidth: number // starting width (e.g. 4)
  movePerRow: number // max lateral shift (cells) per row (reachability)
  freq: number // noise frequency (0.05..0.2)
  notchChance: number // 0..1 small chance to nibble corridor edge
  openHeight?: number // y for open cells (default -1000)
  blockedHeight?: number // y for obstacles (default 0)
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x))
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function stepToward(curr: number, target: number, maxStep: number) {
  if (target > curr) return Math.min(curr + maxStep, target)
  if (target < curr) return Math.max(curr - maxStep, target)
  return curr
}

/**
 * Generate a batch of obstacle rows that ALWAYS contains a continuous safe corridor.
 * Returns heights[row][col] where blocked -> blockedHeight, open -> openHeight.
 */
function generateObstacleHeights(params: ObstacleParams): number[][] {
  const {
    rows,
    cols,
    seed = Math.random() * 10_000,
    minWidth,
    maxWidth,
    movePerRow,
    freq,
    notchChance,
    openHeight = 0,
    blockedHeight = -1000,
  } = params

  const SAFE_START_ROWS = 10 // First 10 rows always fully unblocked

  // Use simplex 2D as 1D noise by fixing Y=seed
  const noise2D = createNoise2D()
  const noise1D = (i: number) => noise2D(i * freq, seed) // [-1, 1]

  const heights: number[][] = new Array(rows)
  const centerStart = Math.floor(cols / 2)
  let cPrev = centerStart

  // width "breathes" and gently shrinks across the batch
  const widthAt = (i: number) => {
    const t = i / rows
    const wiggle = noise1D(i * 0.25 + 100) * 0.5 + 0.5 // [0,1]
    const base = lerp(maxWidth, minWidth, t) // shrink over batch
    const knock = wiggle > 0.7 ? 1 : 0
    return clamp(Math.round(base - knock), minWidth, maxWidth)
  }

  for (let i = 0; i < rows; i++) {
    // First 10 rows: completely unblocked
    if (i < SAFE_START_ROWS) {
      heights[i] = new Array<number>(cols).fill(openHeight)
      continue
    }

    const rowHeights = new Array<number>(cols).fill(blockedHeight)

    // Soft target center from noise, then cap drift for reachability
    const n = noise1D(i) // [-1,1]
    const target = Math.round((n + 1) * 0.5 * (cols - 3)) + 1 // keep off hard edges
    const c = clamp(stepToward(cPrev, target, movePerRow), 0, cols - 1)
    const w = widthAt(i)

    // Corridor indices
    const halfL = Math.floor((w - 1) / 2)
    const halfR = Math.ceil((w - 1) / 2)
    const L = clamp(c - halfL, 0, cols - 1)
    const R = clamp(c + halfR, 0, cols - 1)

    // Open the corridor
    for (let col = L; col <= R; col++) rowHeights[col] = openHeight

    // Optional notch: nibble corridor edge but never seal it
    if (Math.random() < notchChance && w >= 2) {
      const sideLeft = Math.random() < 0.5
      const notchWidth = Math.min(2, w - 1) // preserve ≥1 open cell
      if (sideLeft) {
        for (let k = 0; k < notchWidth; k++) rowHeights[L + k] = blockedHeight
      } else {
        for (let k = 0; k < notchWidth; k++) rowHeights[R - k] = blockedHeight
      }
      // Ensure at least one cell open
      let anyOpen = false
      for (let col = L; col <= R; col++)
        if (rowHeights[col] === openHeight) {
          anyOpen = true
          break
        }
      if (!anyOpen) rowHeights[c] = openHeight // reopen center if we accidentally sealed it
    }

    heights[i] = rowHeights
    cPrev = c
  }

  return heights
}

const Ball: FC = () => {
  const bodyRef = useRef<RapierRigidBody>(null)
  useEffect(() => {
    if (!bodyRef.current) return
    bodyRef.current.setLinvel({ x: 0, y: 0, z: -TERRAIN_SPEED }, true)
  }, [])
  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      colliders="ball"
      userData={{
        type: 'player',
      }}>
      <mesh castShadow={true} position={[0, 5, 0]}>
        <sphereGeometry args={[0.25, 32, 32]} />
        <meshStandardMaterial color="hotpink" />
      </mesh>
    </RigidBody>
  )
}

// https://rapier.rs/docs/user_guides/javascript/rigid_bodies
// https://rapier.rs/docs/user_guides/javascript/colliders
// https://rapier.rs/docs/user_guides/javascript/character_controller/

const Player: FC = () => {
  // const colorMap = useTexture(playerTexture.src)
  const bodyRef = useRef<RapierRigidBody>(null)
  const ballColliderRef = useRef<RapierCollider | null>(null)
  const sphereMeshRef = useRef<any>(null)
  const rotationAxis = useRef(new THREE.Vector3(0, 0, 0))

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

    const current = bodyRef.current.translation()

    console.log({ desiredTranslationDelta })

    // controllerRef.current.computeColliderMovement(
    //   ballColliderRef.current,
    //   desiredTranslationDelta,
    //   QueryFilterFlags.ONLY_FIXED,
    // )
    // const corrected = controllerRef.current.computedMovement()

    // const t = bodyRef.current.translation()
    const next = {
      x: current.x + desiredTranslationDelta.x,
      y: current.y + desiredTranslationDelta.y,
      z: current.z + desiredTranslationDelta.z,
    }
    bodyRef.current.setTranslation(next, true)

    // if (corrected.x === 0 && corrected.z === 0) return

    // // Rolling axis is perpendicular to velocity on the ground plane (world space).
    // // Use world-space rotation to avoid compounding local-axis drift when changing directions.
    // rotationAxis.current.set(corrected.z, 0, -corrected.x)
    // if (rotationAxis.current.lengthSq() === 0) return
    // rotationAxis.current.normalize()
    // // Visual rolling of the sphere (purely cosmetic).
    // const dist = Math.hypot(corrected.x, corrected.z)
    // const rollAngle = dist / PLAYER_RADIUS // angle = arc length / radius
    // sphereMeshRef.current.rotateOnWorldAxis(rotationAxis.current, rollAngle)
    // // Keep quaternion well-conditioned over time.
    // sphereMeshRef.current.quaternion.normalize()
  })

  return (
    <RigidBody
      ref={bodyRef}
      type="dynamic"
      // userData={userData}
      restitution={0}
      colliders={false}
      position={[0, 5.0, 0]}>
      <BallCollider args={[PLAYER_RADIUS]} ref={ballColliderRef} />

      <mesh ref={sphereMeshRef}>
        <sphereGeometry args={[PLAYER_RADIUS, 24, 24]} />
        <meshLambertMaterial color="red" />
      </mesh>
    </RigidBody>
  )
}

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
