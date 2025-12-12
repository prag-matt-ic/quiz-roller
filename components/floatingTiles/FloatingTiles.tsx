'use client'
/* eslint-disable react-hooks/refs */
import { shaderMaterial } from '@react-three/drei'
import { extend, useThree } from '@react-three/fiber'
import {
  type FC,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  DataTexture,
  FloatType,
  InstancedMesh,
  Matrix4,
  NearestFilter,
  RedFormat,
  Texture,
} from 'three'
import {
  GPUComputationRenderer,
  type Variable,
} from 'three/addons/misc/GPUComputationRenderer.js'

import { useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import floatingTilesFragment from '@/components/floatingTiles/shaders/floatingTiles.frag'
import floatingTilesVertex from '@/components/floatingTiles/shaders/floatingTiles.vert'
import positionFragmentShader from '@/components/floatingTiles/shaders/position.frag'
import { COLUMNS, ROWS_RENDERED, type RowData, TILE_SIZE, clamp } from '@/utils/tiles'

type FloatingTilesUniforms = {
  uMix: number
  uPositionTexture: Texture | null
  uRowWorldPositions: Texture | null
  uGridCols: number
  uTileSize: number
  uYMin: number
  uYMax: number
  uZFadeStart: number
  uZFadeEnd: number
  uCameraZ: number
  uRowCount: number
  uScrollZ: number
}

const EXTRA_SIDE_COLUMNS = 4
const GRID_COLS = COLUMNS + EXTRA_SIDE_COLUMNS * 2
const GRID_OFFSET = EXTRA_SIDE_COLUMNS
const TILE_THICKNESS = 0.1
const BOX_SIZE_SCALE = 0.5
const Y_MIN = -8
const Y_MAX = 8
const Z_FADE_START = 16
const Z_FADE_END = 32
const MAX_DELTA_TIME = 0.05
const SPEED_MIN = 0.4
const SPEED_RANGE = 0.8

const INITIAL_FLOATING_TILE_UNIFORMS: FloatingTilesUniforms = {
  uMix: 0.4,
  uPositionTexture: null,
  uRowWorldPositions: null,
  uGridCols: 0,
  uTileSize: TILE_SIZE,
  uYMin: Y_MIN,
  uYMax: Y_MAX,
  uZFadeStart: Z_FADE_START,
  uZFadeEnd: Z_FADE_END,
  uCameraZ: 0,
  uRowCount: ROWS_RENDERED,
  uScrollZ: 0,
}

const CustomFloatingTilesMaterial = shaderMaterial(
  INITIAL_FLOATING_TILE_UNIFORMS,
  floatingTilesVertex,
  floatingTilesFragment,
)
const FloatingTilesMaterial = extend(CustomFloatingTilesMaterial)

export type FloatingTilesHandle = {
  setRowData: (rowIndex: number, rowData: RowData | null) => void
  setRowWorldPositions: (rowPositions: number[]) => void
  setScrollOffset: (scrollZ: number) => void
  step: (delta: number) => void
  reset: () => void
}

type FloatingTilesProps = {
  ref: Ref<FloatingTilesHandle>
  onReadyChange: (isReady: boolean) => void
}

const identityMatrix = new Matrix4()

const createSpawnMaskTexture = (data: Float32Array) => {
  const texture = new DataTexture(data, GRID_COLS, ROWS_RENDERED, RedFormat, FloatType)
  texture.needsUpdate = true
  texture.minFilter = NearestFilter
  texture.magFilter = NearestFilter
  texture.generateMipmaps = false
  texture.flipY = false
  return texture
}

const createRowPositionsTexture = (data: Float32Array) => {
  const texture = new DataTexture(data, ROWS_RENDERED, 1, RedFormat, FloatType)
  texture.needsUpdate = true
  texture.minFilter = NearestFilter
  texture.magFilter = NearestFilter
  texture.generateMipmaps = false
  texture.flipY = false
  return texture
}

const FloatingTiles: FC<FloatingTilesProps> = ({ ref, onReadyChange }) => {
  const count = usePerformanceStore((s) => s.sceneConfig.floatingTiles.instanceCount)
  const rowsData = useGameStore((s) => s.rowsData)
  const renderer = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera)

  const [simToken, setSimToken] = useState(0)
  const isDisabled = count === 0

  const textureSize = useMemo(
    () => Math.max(1, Math.ceil(Math.sqrt(Math.max(1, count)))),
    [count],
  )
  const instanceCount = useMemo(
    () => Math.min(count, textureSize * textureSize),
    [count, textureSize],
  )
  const textureSlotCount = useMemo(() => textureSize * textureSize, [textureSize])

  const meshRef = useRef<InstancedMesh>(null)
  const materialRef = useRef<typeof FloatingTilesMaterial & FloatingTilesUniforms>(null)
  const gpuCompute = useRef<GPUComputationRenderer | null>(null)
  const positionVariable = useRef<Variable | null>(null)

  const positionTextureRef = useRef<DataTexture | null>(null)
  const textureBufferRef = useRef<Float32Array>(new Float32Array(textureSlotCount * 4))

  const spawnMaskDataRef = useRef<Float32Array | null>(null)
  if (spawnMaskDataRef.current == null) {
    spawnMaskDataRef.current = new Float32Array(GRID_COLS * ROWS_RENDERED)
  }
  const spawnMaskTextureRef = useRef<DataTexture | null>(null)
  if (spawnMaskTextureRef.current == null) {
    spawnMaskTextureRef.current = createSpawnMaskTexture(spawnMaskDataRef.current)
  }
  const rowPositionsDataRef = useRef<Float32Array | null>(null)
  if (rowPositionsDataRef.current == null) {
    rowPositionsDataRef.current = new Float32Array(ROWS_RENDERED)
  }
  const hasInitializedSpawnMaskRef = useRef(false)
  const rowPositionsTextureRef = useRef<DataTexture | null>(null)
  if (rowPositionsTextureRef.current == null) {
    rowPositionsTextureRef.current = createRowPositionsTexture(rowPositionsDataRef.current)
  }
  const spawnMaskData = spawnMaskDataRef.current!
  const rowPositionsData = rowPositionsDataRef.current!
  const spawnableCellsRef = useRef<number[]>([])
  const spawnableCellsDirtyRef = useRef(false)
  const rowColumnSpawnableRef = useRef<Int8Array | null>(null)
  if (rowColumnSpawnableRef.current == null) {
    rowColumnSpawnableRef.current = new Int8Array(ROWS_RENDERED * COLUMNS)
    rowColumnSpawnableRef.current.fill(-1)
  }
  const rowColumnSpawnable = rowColumnSpawnableRef.current

  const textureUvs = useMemo(() => {
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

  const ensureTextureBufferSize = useCallback(() => {
    const expectedSize = textureSlotCount * 4
    if (textureBufferRef.current.length === expectedSize) return
    textureBufferRef.current = new Float32Array(expectedSize)
  }, [textureSlotCount])

  const rebuildSpawnableCells = useCallback(() => {
    const mask = spawnMaskData
    const cells: number[] = []
    for (let row = 0; row < ROWS_RENDERED; row++) {
      const rowStart = row * GRID_COLS
      for (let col = 0; col < GRID_COLS; col++) {
        if (mask[rowStart + col] > 0.5) {
          cells.push(row * GRID_COLS + col)
        }
      }
    }
    spawnableCellsRef.current = cells
    spawnableCellsDirtyRef.current = false
  }, [spawnMaskData])

  const pickRandomSpawnCell = useCallback(() => {
    const cells = spawnableCellsRef.current
    if (cells.length === 0) {
      return {
        row: 0,
        col: GRID_OFFSET,
      }
    }
    const id = cells[Math.floor(Math.random() * cells.length)]
    return {
      row: Math.floor(id / GRID_COLS),
      col: id % GRID_COLS,
    }
  }, [])

  const seedInstance = useCallback(
    (instanceIndex: number) => {
      const base = instanceIndex * 4
      const spawn = pickRandomSpawnCell()
      const jitter = Math.random()
      const y = Y_MIN + Math.random() * (Y_MAX - Y_MIN)
      const speed = SPEED_MIN + Math.random() * SPEED_RANGE
      textureBufferRef.current[base + 0] = spawn.col + clamp(jitter, 0, 0.9999)
      textureBufferRef.current[base + 1] = y
      textureBufferRef.current[base + 2] = spawn.row
      textureBufferRef.current[base + 3] = speed
    },
    [pickRandomSpawnCell],
  )

  const seedAllInstances = useCallback(() => {
    ensureTextureBufferSize()
    if (spawnableCellsDirtyRef.current || spawnableCellsRef.current.length === 0) {
      rebuildSpawnableCells()
    }
    for (let i = 0; i < instanceCount; i++) {
      seedInstance(i)
    }
    for (let i = instanceCount; i < textureSlotCount; i++) {
      const base = i * 4
      textureBufferRef.current[base + 0] = 0
      textureBufferRef.current[base + 1] = Y_MIN
      textureBufferRef.current[base + 2] = 0
      textureBufferRef.current[base + 3] = SPEED_MIN
    }
  }, [
    ensureTextureBufferSize,
    instanceCount,
    rebuildSpawnableCells,
    seedInstance,
    textureSlotCount,
  ])

  const writeBufferToTexture = useCallback((texture: DataTexture) => {
    const target = texture.image.data as Float32Array
    target.set(textureBufferRef.current)
    texture.needsUpdate = true
  }, [])

  const initializeSpawnMaskDefaults = useCallback(() => {
    const mask = spawnMaskData
    const columnStates = rowColumnSpawnable
    if (!columnStates) return

    for (let row = 0; row < ROWS_RENDERED; row++) {
      const rowStart = row * GRID_COLS
      const columnStateOffset = row * COLUMNS
      const rowData = rowsData?.[row]

      for (let col = 0; col < GRID_OFFSET; col++) {
        mask[rowStart + col] = 1
      }

      for (let col = 0; col < COLUMNS; col++) {
        const isRaised = rowData?.isRaised?.[col] === 1 ? 1 : 0
        const isSpawnable = isRaised === 1 ? 0 : 1
        const stateIndex = columnStateOffset + col
        columnStates[stateIndex] = isSpawnable
        mask[rowStart + GRID_OFFSET + col] = isSpawnable
      }

      for (let col = GRID_OFFSET + COLUMNS; col < GRID_COLS; col++) {
        mask[rowStart + col] = 1
      }
    }
    spawnMaskTextureRef.current!.needsUpdate = true
    spawnableCellsDirtyRef.current = false
    rebuildSpawnableCells()
  }, [rebuildSpawnableCells, rowColumnSpawnable, rowsData, spawnMaskData])

  const initializeSimulation = useCallback(() => {
    if (!renderer || isDisabled) return
    seedAllInstances()

    const compute = new GPUComputationRenderer(textureSize, textureSize, renderer)
    const positionTexture = compute.createTexture()
    writeBufferToTexture(positionTexture)

    const variable = compute.addVariable(
      'texturePosition',
      positionFragmentShader,
      positionTexture,
    )
    compute.setVariableDependencies(variable, [variable])

    const uniforms = variable.material.uniforms as {
      uDeltaTime: { value: number }
      uYMin: { value: number }
      uYMax: { value: number }
      uGridCols: { value: number }
      uRowCount: { value: number }
      uSpawnMask: { value: Texture | null }
      uSpawnMaskSize: { value: [number, number] }
    }

    uniforms.uDeltaTime = { value: 0.0 }
    uniforms.uYMin = { value: Y_MIN }
    uniforms.uYMax = { value: Y_MAX }
    uniforms.uGridCols = { value: GRID_COLS }
    uniforms.uRowCount = { value: ROWS_RENDERED }
    uniforms.uSpawnMask = { value: spawnMaskTextureRef.current }
    uniforms.uSpawnMaskSize = { value: [GRID_COLS, ROWS_RENDERED] }

    const error = compute.init()
    if (error !== null) throw new Error(error)

    gpuCompute.current = compute
    positionVariable.current = variable
    positionTextureRef.current = positionTexture
    if (materialRef.current) {
      materialRef.current.uPositionTexture = compute.getCurrentRenderTarget(variable).texture
    }
  }, [isDisabled, renderer, seedAllInstances, textureSize, writeBufferToTexture])

  useEffect(() => {
    if (hasInitializedSpawnMaskRef.current) return
    hasInitializedSpawnMaskRef.current = true
    initializeSpawnMaskDefaults()
  }, [initializeSpawnMaskDefaults])

  useEffect(() => {
    let mounted = true
    try {
      if (!isDisabled) initializeSimulation()
      if (mounted) onReadyChange(true)
    } catch (error) {
      console.error('Failed to initialize FloatingTiles simulation', error)
      onReadyChange(false)
    }

    return () => {
      mounted = false
      onReadyChange(false)
      gpuCompute.current?.dispose()
      gpuCompute.current = null
      positionVariable.current = null
    }
  }, [initializeSimulation, isDisabled, onReadyChange, simToken])

  useEffect(() => {
    if (!meshRef.current) return
    meshRef.current.count = instanceCount
    for (let i = 0; i < instanceCount; i++) {
      meshRef.current.setMatrixAt(i, identityMatrix)
    }
    meshRef.current.instanceMatrix.needsUpdate = true
  }, [instanceCount])

  useEffect(() => {
    if (!materialRef.current) return
    materialRef.current.uRowWorldPositions = rowPositionsTextureRef.current ?? null
  }, [])

  const updateRowMask = useCallback(
    (rowIndex: number, rowData: RowData | null) => {
      if (rowIndex < 0 || rowIndex >= ROWS_RENDERED) return
      const mask = spawnMaskData
      const rowStart = rowIndex * GRID_COLS
      const raisedMask = rowData?.isRaised ?? []
      const columnStates = rowColumnSpawnable
      if (!columnStates) return

      let maskChanged = false

      for (let col = 0; col < GRID_OFFSET; col++) {
        const index = rowStart + col
        if (mask[index] !== 1) {
          mask[index] = 1
          maskChanged = true
        }
      }

      const columnStateOffset = rowIndex * COLUMNS
      for (let col = 0; col < COLUMNS; col++) {
        const isRaised = (raisedMask[col] ?? 0) === 1 ? 1 : 0
        const isSpawnable = isRaised === 1 ? 0 : 1
        const stateIndex = columnStateOffset + col
        const prevState = columnStates[stateIndex]

        if (prevState !== isSpawnable) {
          columnStates[stateIndex] = isSpawnable
          maskChanged = true
        }

        const maskIndex = rowStart + GRID_OFFSET + col
        if (mask[maskIndex] !== isSpawnable) {
          mask[maskIndex] = isSpawnable
          maskChanged = true
        }
      }

      for (let col = GRID_OFFSET + COLUMNS; col < GRID_COLS; col++) {
        const index = rowStart + col
        if (mask[index] !== 1) {
          mask[index] = 1
          maskChanged = true
        }
      }

      if (maskChanged) {
        spawnMaskTextureRef.current!.needsUpdate = true
        spawnableCellsDirtyRef.current = true
        // Performance optimization:
        // We defer rebuildSpawnableCells() to the next reseed so the JS-side list
        // stays current without doing a full grid scan on every row update.
        // rebuildSpawnableCells()
      }
    },
    [rowColumnSpawnable, spawnMaskData], // Removed rebuildSpawnableCells from dependency array
  )

  const updateRowWorldPositions = useCallback(
    (rowPositions: number[]) => {
      const target = rowPositionsData
      let changed = false
      for (let i = 0; i < Math.min(rowPositions.length, ROWS_RENDERED); i++) {
        const value = rowPositions[i]
        if (!Number.isFinite(value)) continue
        if (target[i] !== value) {
          target[i] = value
          changed = true
        }
      }
      if (changed) {
        rowPositionsTextureRef.current!.needsUpdate = true
        if (materialRef.current) {
          materialRef.current.uRowWorldPositions = rowPositionsTextureRef.current!
        }
      }
    },
    [rowPositionsData],
  )

  const stepSimulation = useCallback(
    (delta: number) => {
      if (
        isDisabled ||
        !gpuCompute.current ||
        !positionVariable.current ||
        !materialRef.current
      ) {
        return
      }

      const clampedDelta = clamp(delta, 0, MAX_DELTA_TIME)
      const uniforms = positionVariable.current.material.uniforms as {
        uDeltaTime: { value: number }
      }
      uniforms.uDeltaTime.value = clampedDelta
      materialRef.current.uCameraZ = camera.position.z

      gpuCompute.current.compute()

      const texture = gpuCompute.current.getCurrentRenderTarget(
        positionVariable.current,
      ).texture
      materialRef.current.uPositionTexture = texture
    },
    [camera, isDisabled],
  )

  useImperativeHandle(
    ref,
    () => ({
      setRowData: (rowIndex, rowData) => {
        if (isDisabled) return
        updateRowMask(rowIndex, rowData)
      },
      setRowWorldPositions: (positions) => {
        if (isDisabled) return
        updateRowWorldPositions(positions)
      },
      setScrollOffset: (scrollZ) => {
        if (isDisabled || !materialRef.current) return
        materialRef.current.uScrollZ = scrollZ
      },
      step: (delta) => {
        if (isDisabled) return
        stepSimulation(delta)
      },
      reset: () => {
        if (isDisabled) return
        setSimToken((prev) => prev + 1)
      },
    }),
    [isDisabled, stepSimulation, updateRowMask, updateRowWorldPositions],
  )

  if (isDisabled) return null

  const BOX_W = TILE_SIZE * BOX_SIZE_SCALE
  const BOX_H = TILE_THICKNESS * BOX_SIZE_SCALE
  const BOX_D = TILE_SIZE * BOX_SIZE_SCALE

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, instanceCount]}
      frustumCulled={false}
      count={instanceCount}>
      <boxGeometry args={[BOX_W, BOX_H, BOX_D]}>
        <instancedBufferAttribute attach="attributes-textureUv" args={[textureUvs, 2]} />
      </boxGeometry>
      <FloatingTilesMaterial
        key={(CustomFloatingTilesMaterial as unknown as { key: string }).key}
        ref={materialRef}
        transparent={true}
        depthTest={true}
        depthWrite={false}
        uGridCols={GRID_COLS}
        uTileSize={TILE_SIZE}
        uYMin={Y_MIN}
        uYMax={Y_MAX}
        uZFadeStart={Z_FADE_START}
        uZFadeEnd={Z_FADE_END}
        uRowCount={ROWS_RENDERED}
        uScrollZ={0}
      />
    </instancedMesh>
  )
}

export default FloatingTiles
