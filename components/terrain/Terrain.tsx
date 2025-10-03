'use client'

import { useFrame } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  InstancedRigidBodyProps,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import { type FC, useEffect, useRef, useState } from 'react'
import { createNoise2D } from 'simplex-noise'

// Grid configuration
const COLUMNS = 16
const ROWS = 24
const BOX_SIZE = 1
const BOX_SPACING = 1
const TERRAIN_SPEED = 2

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
      openHeight: -0.5, // ground level (below player spawn)
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

        // Debug: Log terrain at player starting position
        if (row === 5 && col === Math.floor(COLUMNS / 2)) {
          console.warn('Terrain at player start position:', {
            row,
            col,
            x,
            y,
            z,
            playerStart: [0, 'PLAYER_RADIUS * 2', -5],
          })
        }

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

    // Move all terrain boxes forward manually and recycle when they pass behind
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

        // Advance to next row when we've processed all columns of current row
        if (col === COLUMNS - 1) {
          nextDataIndex.current++
        }
      } else {
        // Move the terrain forward manually since it's now fixed type
        body.setTranslation(
          {
            x: position.x,
            y: position.y,
            z: position.z + TERRAIN_SPEED * (1 / 60),
          },
          true,
        )
      }
    })
  })

  if (!terrainInstances.length) return null

  return (
    <group rotation={[0, 0, 0]}>
      <InstancedRigidBodies
        ref={rigidBodies}
        instances={terrainInstances}
        type="fixed"
        canSleep={false}
        sensor={false}
        colliders="cuboid"
        restitution={0.0}
        friction={0.7}>
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

export default Terrain

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
