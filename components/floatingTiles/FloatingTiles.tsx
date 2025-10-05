'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import { type FC, useEffect, useMemo, useRef } from 'react'
import { InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three'

import { COLUMNS, TILE_SIZE, TILE_THICKNESS } from '@/components/terrain/terrainBuilder'

import floatingTilesFragment from './shaders/floatingTiles.frag'
import floatingTilesVertex from './shaders/floatingTiles.vert'

type FloatingTilesUniforms = {
  uMix: number
}

const INITIAL_FLOATING_TILE_UNIFORMS: FloatingTilesUniforms = {
  uMix: 0.4,
}

const CustomFloatingTilesMaterial = shaderMaterial(
  INITIAL_FLOATING_TILE_UNIFORMS,
  floatingTilesVertex,
  floatingTilesFragment,
)
const FloatingTilesMaterial = extend(CustomFloatingTilesMaterial)

type Props = {
  isMobile: boolean
  /** Optional override for instance count */
  count?: number
}

// FloatingTiles: lightweight instanced box field that rises upward from -Y
// Notes:
// - Avoid per-frame allocations; reuse scratch objects and typed arrays
// - Geometry matches Terrain tiles (flat boxes using TILE_SIZE/TILE_THICKNESS)
// - Simple CPU simulation for initial setup; can evolve to GPU later
const FloatingTiles: FC<Props> = ({ isMobile, count }) => {
  // Instance count
  const instanceCount = useMemo(() => count ?? (isMobile ? 80 : 160), [count, isMobile])

  // Grid config: wider than terrain. Example: terrain has 16 cols; use 32 here
  const GRID_COLS = COLUMNS * 2 // 32
  const MIDDLE_START = (GRID_COLS - COLUMNS) / 2 // 8
  const MIDDLE_END = MIDDLE_START + COLUMNS - 1 // 23
  // Allowed columns live strictly left of terrain band and right of it
  const allowedColsLeft = useMemo(() => {
    const arr: number[] = []
    for (let c = 0; c < MIDDLE_START; c++) arr.push(c)
    return arr
  }, [MIDDLE_START])
  const allowedColsRight = useMemo(() => {
    const arr: number[] = []
    for (let c = MIDDLE_END + 1; c < GRID_COLS; c++) arr.push(c)
    return arr
  }, [GRID_COLS, MIDDLE_END])
  const allowedCols = useMemo(
    () => [...allowedColsLeft, ...allowedColsRight],
    [allowedColsLeft, allowedColsRight],
  )

  // Z is kept near the playfield and quantized to the terrain grid for coherence
  const Z_ROWS_HALF = 12 // rows in each direction (band depth)
  const Z_MIN_ROW = -Z_ROWS_HALF
  const Z_MAX_ROW = Z_ROWS_HALF
  // Vertical motion band
  const Y_MIN = -16 // spawn band start (bottom)
  const Y_MAX = 8 // recycle threshold (top)

  // Per-instance state buffers (heap-allocated once)
  const positions = useRef<Float32Array>(new Float32Array(instanceCount * 3))
  const speeds = useRef<Float32Array>(new Float32Array(instanceCount))

  // Refs for Three objects and frame-scope scratch
  const meshRef = useRef<InstancedMesh>(null)
  const tmpMatrix = useRef<Matrix4>(new Matrix4())
  const tmpPos = useRef<Vector3>(new Vector3())
  const tmpQuat = useRef<Quaternion>(new Quaternion())
  const tmpScale = useRef<Vector3>(new Vector3(1, 1, 1))

  function rand(min: number, max: number) {
    return min + Math.random() * (max - min)
  }
  function randInt(min: number, max: number) {
    return (min + Math.floor(Math.random() * (max - min + 1))) | 0
  }
  function colToXForGrid(col: number, gridCols: number) {
    // Match Terrain's col-to-world transform but for a wider grid
    return (col - gridCols / 2 + 0.5) * TILE_SIZE
  }

  // Spawn at the bottom band with grid-aligned X (side bands only) and Z
  function respawn(i: number, ySpread = 0) {
    const base = i * 3
    const col = allowedCols[randInt(0, allowedCols.length - 1)]
    const x = colToXForGrid(col, GRID_COLS)
    const rowZ = randInt(Z_MIN_ROW, Z_MAX_ROW)
    const z = rowZ * TILE_SIZE

    positions.current[base + 0] = x
    positions.current[base + 1] = Y_MIN + (ySpread > 0 ? Math.random() * ySpread : 0)
    positions.current[base + 2] = z
    // Slight speed variance; keep it modest for calm motion
    speeds.current[i] = rand(0.6, 1.2)
  }

  // Initialize positions: sprinkle a subset up the column so it doesn't appear all at once
  useEffect(() => {
    for (let i = 0; i < instanceCount; i++) {
      respawn(i, Y_MAX - Y_MIN)
    }

    // Write initial matrices once on mount
    if (!meshRef.current) return
    for (let i = 0; i < instanceCount; i++) {
      const base = i * 3
      tmpPos.current.set(
        positions.current[base + 0],
        positions.current[base + 1],
        positions.current[base + 2],
      )
      tmpMatrix.current.compose(tmpPos.current, tmpQuat.current.identity(), tmpScale.current)
      meshRef.current.setMatrixAt(i, tmpMatrix.current)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [instanceCount])

  // Float upward; recycle above the top bound to the bottom band
  useFrame((_, dt) => {
    if (!meshRef.current) return

    // Clamp dt to avoid huge jumps on tab switch
    const delta = Math.min(dt, 0.05)

    for (let i = 0; i < instanceCount; i++) {
      const base = i * 3
      const speed = speeds.current[i]
      const y = positions.current[base + 1] + speed * delta
      positions.current[base + 1] = y <= Y_MAX ? y : Y_MIN
      if (y > Y_MAX) {
        // When recycling, choose new side column and row-aligned Z
        const col = allowedCols[randInt(0, allowedCols.length - 1)]
        positions.current[base + 0] = colToXForGrid(col, GRID_COLS)
        const rowZ = randInt(Z_MIN_ROW, Z_MAX_ROW)
        positions.current[base + 2] = rowZ * TILE_SIZE
        speeds.current[i] = rand(0.6, 1.2)
      }

      tmpPos.current.set(
        positions.current[base + 0],
        positions.current[base + 1],
        positions.current[base + 2],
      )
      tmpMatrix.current.compose(tmpPos.current, tmpQuat.current.identity(), tmpScale.current)
      meshRef.current.setMatrixAt(i, tmpMatrix.current)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
  })

  // Slightly smaller than terrain tiles
  const BOX_W = TILE_SIZE * 0.8
  const BOX_H = TILE_THICKNESS * 0.8
  const BOX_D = TILE_SIZE * 0.8

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, instanceCount]}
      castShadow={false}>
      <boxGeometry args={[BOX_W, BOX_H, BOX_D]} />
      <FloatingTilesMaterial
        key={(CustomFloatingTilesMaterial as unknown as { key: string }).key}
        uMix={INITIAL_FLOATING_TILE_UNIFORMS.uMix}
        transparent={false}
        depthWrite
      />
    </instancedMesh>
  )
}

export default FloatingTiles
