'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import { type FC, useEffect, useMemo, useRef } from 'react'
import { DataTexture, InstancedMesh, Matrix4, NearestFilter, Texture } from 'three'
import {
  GPUComputationRenderer,
  type Variable,
} from 'three/addons/misc/GPUComputationRenderer.js'

import floatingTilesFragment from '@/components/floatingTiles/shaders/floatingTiles.frag'
import floatingTilesVertex from '@/components/floatingTiles/shaders/floatingTiles.vert'
import positionFragmentShader from '@/components/floatingTiles/shaders/position.frag'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { COLUMNS, TILE_SIZE, TILE_THICKNESS } from '@/utils/tiles'

type FloatingTilesUniforms = {
  uMix: number
  uPositionTexture: Texture | null
}

const INITIAL_FLOATING_TILE_UNIFORMS: FloatingTilesUniforms = {
  uMix: 0.4,
  uPositionTexture: null,
}

const CustomFloatingTilesMaterial = shaderMaterial(
  INITIAL_FLOATING_TILE_UNIFORMS,
  floatingTilesVertex,
  floatingTilesFragment,
)
const FloatingTilesMaterial = extend(CustomFloatingTilesMaterial)

// Configuration constants
const EXTRA_SIDE_COLUMNS = 8
const Z_ROWS_HALF = 20 // rows in each direction (band depth)
const Z_MIN_ROW = -Z_ROWS_HALF
const Z_MAX_ROW = Z_ROWS_HALF
const Y_MIN = -16 // spawn band start (bottom)
const Y_MAX = 10 // recycle threshold (top)
const Z_FADE_START = 25 // start fading distance
const Z_FADE_END = 35 // fully faded distance
const BOX_SIZE_SCALE = 0.75 // scale factor relative to terrain tiles
const MAX_DELTA_TIME = 0.05 // clamp dt to avoid huge jumps on tab switch

// Grid config: widen beyond terrain by EXTRA_SIDE_COLUMNS per side
const GRID_COLS = 2 * COLUMNS + 2 * EXTRA_SIDE_COLUMNS
const MIDDLE_START = (GRID_COLS - COLUMNS) / 2
const MIDDLE_END = MIDDLE_START + COLUMNS - 1

// Allowed columns live strictly left of terrain band and right of it
const allowedColsLeft: number[] = Array.from({ length: MIDDLE_START }, (_, i) => i)
const allowedColsRight: number[] = Array.from(
  { length: GRID_COLS - MIDDLE_END - 1 },
  (_, i) => MIDDLE_END + 1 + i,
)
const allowedCols = [...allowedColsLeft, ...allowedColsRight]

const FloatingTiles: FC = () => {
  const count = usePerformanceStore((s) => s.sceneConfig.floatingTiles.instanceCount)
  const renderer = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  const isDisabled = count === 0 // TODO: Kill the GPGPU process entirely if it's disabled.

  // Target instance count, rounded up to a perfect square to avoid wasted compute texels
  const textureSize = useMemo(() => Math.ceil(Math.sqrt(count)), [count])
  const instanceCount = useMemo(() => textureSize * textureSize, [textureSize])

  // Per-instance state buffers (heap-allocated once)
  const positions = useRef<Float32Array>(new Float32Array(instanceCount * 3))

  // Refs for Three objects and frame-scope scratch
  const meshRef = useRef<InstancedMesh>(null)
  const materialRef = useRef<typeof FloatingTilesMaterial & FloatingTilesUniforms>(null)

  // GPU Computation for position and alpha (alpha computed from Y position)
  const gpuCompute = useRef<GPUComputationRenderer | null>(null)
  const positionVariable = useRef<Variable | null>(null)

  // Texture UVs for sampling GPU compute texture
  const textureUvs = useMemo(() => {
    // Sample at texel centers to avoid filtering between neighbors
    const uvs = new Float32Array(instanceCount * 2)
    for (let i = 0; i < instanceCount; i++) {
      const tx = i % textureSize
      const ty = Math.floor(i / textureSize)
      const x = (tx + 0.5) / textureSize
      const y = (ty + 0.5) / textureSize
      uvs[i * 2] = x
      uvs[i * 2 + 1] = y
    }
    return uvs
  }, [instanceCount, textureSize])

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
    // Speed variance handled in GPU; no CPU-side speed state needed
  }

  // Initialize positions: sprinkle a subset up the column so it doesn't appear all at once
  useEffect(() => {
    // Ensure buffer matches instance count
    if (positions.current.length !== instanceCount * 3) {
      positions.current = new Float32Array(instanceCount * 3)
    }
    for (let i = 0; i < instanceCount; i++) {
      respawn(i, Y_MAX - Y_MIN)
    }

    // Set instance matrices to identity - positions come from GPU texture
    if (!meshRef.current) return
    const identityMatrix = new Matrix4()
    for (let i = 0; i < instanceCount; i++) {
      meshRef.current.setMatrixAt(i, identityMatrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [instanceCount])

  // Initialize GPU compute for position (alpha computed within position shader)
  useEffect(() => {
    if (!renderer || isDisabled) return

    try {
      gpuCompute.current = new GPUComputationRenderer(textureSize, textureSize, renderer)

      // Create initial position texture (W channel reserved for alpha; computed on GPU)
      const dtPosition = gpuCompute.current.createTexture()
      // Ensure no filtering on data textures to avoid bleeding
      dtPosition.minFilter = NearestFilter
      dtPosition.magFilter = NearestFilter
      // Mipmaps off for data textures
      dtPosition.generateMipmaps = false
      fillPositionTexture(dtPosition, positions.current)

      // Add position variable to GPU compute
      positionVariable.current = gpuCompute.current.addVariable(
        'texturePosition',
        positionFragmentShader,
        dtPosition,
      )

      // Set dependencies: position only depends on itself
      gpuCompute.current.setVariableDependencies(positionVariable.current, [
        positionVariable.current,
      ])

      // Set uniforms for position shader
      const positionUniforms = positionVariable.current.material.uniforms as {
        uDeltaTime: { value: number }
        uYMin: { value: number }
        uYMax: { value: number }
        uGridCols: { value: number }
        uTerrainCols: { value: number }
        uTileSize: { value: number }
        uZMinRow: { value: number }
        uZMaxRow: { value: number }
        uZFadeStart: { value: number }
        uZFadeEnd: { value: number }
        uCameraZ: { value: number }
      }
      positionUniforms.uDeltaTime = { value: 0.016 }
      positionUniforms.uYMin = { value: Y_MIN }
      positionUniforms.uYMax = { value: Y_MAX }
      positionUniforms.uGridCols = { value: GRID_COLS }
      positionUniforms.uTerrainCols = { value: COLUMNS }
      positionUniforms.uTileSize = { value: TILE_SIZE }
      positionUniforms.uZMinRow = { value: Z_MIN_ROW }
      positionUniforms.uZMaxRow = { value: Z_MAX_ROW }
      // Z fade: start fading at ~25 units, fully faded by ~35 units
      positionUniforms.uZFadeStart = { value: Z_FADE_START }
      positionUniforms.uZFadeEnd = { value: Z_FADE_END }
      positionUniforms.uCameraZ = { value: camera.position.z }

      // Initialize GPU compute
      const error = gpuCompute.current.init()
      if (error !== null) throw new Error(error)

      // Force Nearest filtering on the compute render targets to prevent sampling overhead/bleeding
      if (positionVariable.current) {
        const rtA = positionVariable.current.renderTargets[0].texture
        const rtB = positionVariable.current.renderTargets[1].texture
        rtA.minFilter = NearestFilter
        rtA.magFilter = NearestFilter
        rtA.generateMipmaps = false
        rtB.minFilter = NearestFilter
        rtB.magFilter = NearestFilter
        rtB.generateMipmaps = false
      }
    } catch (error) {
      console.error('Error initializing FloatingTiles GPUComputationRenderer:', error)
    }

    return () => {
      // Cleanup GPU computation resources on unmount
      gpuCompute.current?.dispose()
      gpuCompute.current = null
      positionVariable.current = null
    }
  }, [renderer, textureSize, camera.position.z, isDisabled])

  // GPU computation - position and alpha computed on GPU
  useFrame((_, dt) => {
    if (!meshRef.current) return
    if (!gpuCompute.current) return
    if (!positionVariable.current) return
    if (!materialRef.current) return
    if (isDisabled) return

    // Clamp dt to avoid huge jumps on tab switch
    const delta = Math.min(dt, MAX_DELTA_TIME)

    // Update position uniforms
    const positionUniforms = positionVariable.current.material.uniforms as {
      uDeltaTime: { value: number }
      uCameraZ: { value: number }
    }
    positionUniforms.uDeltaTime.value = delta
    positionUniforms.uCameraZ.value = camera.position.z

    // Compute the simulation
    gpuCompute.current.compute()

    // Set the result texture to the material (contains position xyz + alpha w)
    materialRef.current.uPositionTexture = gpuCompute.current.getCurrentRenderTarget(
      positionVariable.current,
    ).texture

    // Note: Instance matrices are now mostly unused since positions come from GPU texture
    // We keep the mesh to maintain the instancing system, but transforms are in the shader
  })

  // Slightly smaller than terrain tiles
  const BOX_W = TILE_SIZE * BOX_SIZE_SCALE
  const BOX_H = TILE_THICKNESS * BOX_SIZE_SCALE
  const BOX_D = TILE_SIZE * BOX_SIZE_SCALE

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, instanceCount]}
      castShadow={false}
      frustumCulled={false}>
      <boxGeometry args={[BOX_W, BOX_H, BOX_D]}>
        {/**
         * IMPORTANT: This must be an InstancedBufferAttribute so each instance
         * gets a single UV to sample its texel from the position texture.
         * Using BufferAttribute (per-vertex) mangles geometry because each vertex
         * would sample a different texel, stretching triangles across space.
         */}
        <instancedBufferAttribute attach="attributes-textureUv" args={[textureUvs, 2]} />
      </boxGeometry>
      <FloatingTilesMaterial
        key={(CustomFloatingTilesMaterial as unknown as { key: string }).key}
        ref={materialRef}
        uMix={INITIAL_FLOATING_TILE_UNIFORMS.uMix}
        uPositionTexture={INITIAL_FLOATING_TILE_UNIFORMS.uPositionTexture}
        transparent={true}
        depthWrite={true}
      />
    </instancedMesh>
  )
}

// Helper function to fill position texture with initial data
// Note: W channel is initialized to 0, will be computed as alpha on first compute pass
const fillPositionTexture = (texturePosition: DataTexture, positions: Float32Array) => {
  const posArray = texturePosition.image.data as Float32Array

  for (let i = 0, k = 0; i < positions.length / 3; i++, k += 4) {
    const x = positions[i * 3 + 0]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]

    // RGBA: xyz position + placeholder (will become alpha after first compute)
    posArray[k + 0] = x
    posArray[k + 1] = y
    posArray[k + 2] = z
    posArray[k + 3] = 0.0 // Will be computed as alpha in first frame
  }

  texturePosition.needsUpdate = true
}

export default FloatingTiles
