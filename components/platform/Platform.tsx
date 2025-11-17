'use client'

import { type InstancedRigidBodyProps } from '@react-three/rapier'
import { type FC, useEffect, useRef, useState } from 'react'

import { PLAYER_INITIAL_POSITION_VEC3, Stage, useGameStore } from '@/components/GameProvider'
import HomeElements, { type HomeElementsHandle } from '@/components/platform/home/HomeElements'
import InfoElements, { type InfoElementsHandle } from '@/components/platform/info/InfoElements'
import { PlatformTiles, type InstancedTilesHandle } from '@/components/platform/tiles/Tiles'
import { useGameFrame } from '@/hooks/useGameFrame'
import { generateHomeSectionRowData } from '@/utils/platform/homeSection'
import { generateObstacleHeights } from '@/utils/platform/obstaclesSection'
import {
  FIRST_OBSTACLE_SECTION_ROWS,
  generateInfoSectionRowData,
  OBSTACLE_SECTION_ROWS,
} from '@/utils/platform/infoSection'
import {
  colToX,
  COLUMNS,
  TERRAIN_SPEED_UNITS,
  INITIAL_ROWS_Z_OFFSET,
  ENTRY_END_Z,
  MAX_Z,
  RowData,
  ROWS_RENDERED,
  SAFE_HEIGHT,
  TILE_SIZE,
  UNSAFE_HEIGHT,
} from '@/utils/tiles'
import usePlayerInput from '@/hooks/usePlayerInput'

// Type for obstacle generation configuration
type ObstacleGenerationConfig = {
  rows: number
  seed: number
  minWidth: number
  maxWidth: number
  movePerRow: number
  freq: number
  notchChance: number
}

const DEFAULT_OBSTACLE_CONFIG: Omit<ObstacleGenerationConfig, 'rows' | 'seed'> = {
  minWidth: 4,
  maxWidth: 8,
  movePerRow: 1,
  freq: 0.12,
  notchChance: 0.1,
}

const EMPTY_ROW_DATA: RowData = {
  heights: Array.from({ length: COLUMNS }, () => UNSAFE_HEIGHT),
  type: 'empty',
  isSectionStart: false,
  isSectionEnd: false,
}

const PLAYER_STAGE_Z = PLAYER_INITIAL_POSITION_VEC3.z
const STAGE_ACTIVATION_HALF_BAND = TILE_SIZE * 0.5
const ROW_VISIBILITY_THRESHOLD_Z = ENTRY_END_Z

const Platform: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const resetPlatformTick = useGameStore((s) => s.resetPlatformTick)
  const goToStage = useGameStore((s) => s.goToStage)
  const setInfoContentIndex = useGameStore((s) => s.setInfoContentIndex)

  const { input: playerInput } = usePlayerInput()

  const instancedTilesRef = useRef<InstancedTilesHandle>(null)
  const [tileInstances, setTileInstances] = useState<InstancedRigidBodyProps[]>([])
  const hasInitialized = useRef(false)

  // Deterministic scrolling state
  const currentScrollPosition = useRef(0)
  const baseZByRow = useRef<number[]>([])
  const wrapCountByRow = useRef<number[]>([])
  const rowZByIndex = useRef<number[]>([])
  const rowIsVisible = useRef<boolean[]>([])
  const xByBodyIndex = useRef<number[]>([])
  const yByBodyIndex = useRef<number[]>([])

  // Per-instance GPU attributes
  const instanceSeed = useRef<Float32Array | null>(null)
  const instanceVisibility = useRef<Float32Array | null>(null)
  const instanceIsHighlighted = useRef<Float32Array | null>(null)

  const translation = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })

  // Precomputed row sequence
  const rowsData = useRef<RowData[]>([])
  const nextRowDataIndex = useRef(0)
  const activeRowsData = useRef<RowData[]>([])

  const homeElements = useRef<HomeElementsHandle | null>(null)
  const infoElements = useRef<InfoElementsHandle | null>(null)

  function insertInfoRows(contentIndex: 0 | 1 | 2) {
    const rows = generateInfoSectionRowData(contentIndex)
    rowsData.current = [...rowsData.current, ...rows]
  }

  function insertHomeRows() {
    const rows = generateHomeSectionRowData()
    rowsData.current = [...rowsData.current, ...rows]
  }

  function getObstacleSectionRows(rows: number = OBSTACLE_SECTION_ROWS): RowData[] {
    const config: ObstacleGenerationConfig = {
      rows,
      seed: Math.floor(Math.random() * 1_000_000),
      ...DEFAULT_OBSTACLE_CONFIG,
    }

    const heights = generateObstacleHeights(config)
    return heights.map((columnHeights, rowIndex) => ({
      heights: columnHeights,
      type: 'obstacles' as const,
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === rows - 1,
    }))
  }

  function insertObstacleRows(rows?: number) {
    const blocks = getObstacleSectionRows(rows)
    rowsData.current = [...rowsData.current, ...blocks]
  }

  useEffect(() => {
    function setupInitialRowsAndInstances() {
      // Reset state
      rowsData.current = []
      nextRowDataIndex.current = 0
      activeRowsData.current = []
      baseZByRow.current = []
      wrapCountByRow.current = []
      rowZByIndex.current = []
      rowIsVisible.current = []
      xByBodyIndex.current = []
      yByBodyIndex.current = []
      currentScrollPosition.current = 0

      insertHomeRows()
      insertObstacleRows(FIRST_OBSTACLE_SECTION_ROWS)
      insertInfoRows(0)
      insertObstacleRows()
      insertInfoRows(1)
      insertObstacleRows()
      insertInfoRows(2)
      insertObstacleRows()
      // TODO: insert CTA Rows.

      const instances: InstancedRigidBodyProps[] = []
      const totalInstances = ROWS_RENDERED * COLUMNS
      instanceVisibility.current = new Float32Array(totalInstances)
      instanceSeed.current = new Float32Array(totalInstances)
      instanceIsHighlighted.current = new Float32Array(totalInstances)

      let nextRowZ = INITIAL_ROWS_Z_OFFSET

      for (let rowIndex = 0; rowIndex < ROWS_RENDERED; rowIndex++) {
        const rowData = rowsData.current[rowIndex] ?? EMPTY_ROW_DATA
        activeRowsData.current[rowIndex] = rowData
        baseZByRow.current[rowIndex] = nextRowZ
        rowZByIndex.current[rowIndex] = nextRowZ
        wrapCountByRow.current[rowIndex] = 0
        rowIsVisible.current[rowIndex] = false

        for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex++) {
          const x = colToX(columnIndex)
          const z = nextRowZ
          const y = rowData.heights[columnIndex]
          const bodyIndex = rowIndex * COLUMNS + columnIndex
          xByBodyIndex.current[bodyIndex] = x
          yByBodyIndex.current[bodyIndex] = y

          instanceVisibility.current[bodyIndex] = y === SAFE_HEIGHT ? 1 : 0
          instanceSeed.current[bodyIndex] = Math.random()
          instanceIsHighlighted.current[bodyIndex] = rowData.isHighlighted?.[columnIndex] ?? 0

          instances.push({
            key: `tile-${rowIndex}-${columnIndex}`,
            position: [x, y, z],
            userData: { type: 'tile', rowIndex, colIndex: columnIndex },
          })
        }

        nextRowZ -= TILE_SIZE
      }

      setTileInstances(instances)
      hasInitialized.current = true
      nextRowDataIndex.current = ROWS_RENDERED
    }

    setupInitialRowsAndInstances()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetPlatformTick])

  function updateInstanceAttributesForRow(rowIndex: number, newRowData?: RowData) {
    const data = newRowData ?? EMPTY_ROW_DATA
    activeRowsData.current[rowIndex] = data

    for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex++) {
      const bodyIndex = rowIndex * COLUMNS + columnIndex
      const y = data.heights[columnIndex]
      yByBodyIndex.current[bodyIndex] = y
      instanceVisibility.current![bodyIndex] = y === SAFE_HEIGHT ? 1 : 0
      instanceIsHighlighted.current![bodyIndex] = data.isHighlighted?.[columnIndex] ?? 0
    }
  }

  function markInstanceAttributesDirty() {
    if (instancedTilesRef.current?.visibilityAttribute) {
      instancedTilesRef.current.visibilityAttribute.needsUpdate = true
    }
    if (instancedTilesRef.current?.isHighlightedAttribute) {
      instancedTilesRef.current.isHighlightedAttribute.needsUpdate = true
    }
  }

  function hideRowDecorations(rowIndex: number) {
    const row = activeRowsData.current[rowIndex]
    if (!row) return
    if (row.type === 'info') {
      infoElements.current?.hideElementsIfNeeded(row)
    }
  }

  function positionRowDecorations(rowIndex: number, rowZ: number) {
    const row = activeRowsData.current[rowIndex]
    if (!row) return
    if (row.type === 'info') {
      infoElements.current?.positionElementsIfNeeded(row, rowZ)
    }
  }

  function updateStageForRow(rowIndex: number, rowZ: number) {
    const row = activeRowsData.current[rowIndex]
    if (!row || !row.isSectionStart) return

    const isPlayerWithinRow = Math.abs(rowZ - PLAYER_STAGE_Z) <= STAGE_ACTIVATION_HALF_BAND
    if (!isPlayerWithinRow) return

    if (row.type === 'home' && stage !== Stage.HOME) {
      goToStage(Stage.HOME)
      return
    }

    if (row.type === 'info') {
      const contentIndex = row.infoContentIndex ?? 0
      setInfoContentIndex(contentIndex)
      if (stage !== Stage.INFO) {
        goToStage(Stage.INFO)
      }
      return
    }

    if (row.type === 'obstacles' && stage !== Stage.TERRAIN) {
      goToStage(Stage.TERRAIN)
      return
    }

    if (row.type === 'cta' && stage !== Stage.CTA) {
      goToStage(Stage.CTA)
    }
  }

  function applyForwardRowWraps(rowIndex: number, wrapsToApply: number): void {
    if (wrapsToApply <= 0) return
    let wrapsApplied = 0

    for (; wrapsApplied < wrapsToApply; wrapsApplied++) {
      hideRowDecorations(rowIndex)
      rowIsVisible.current[rowIndex] = false
      const newRowData = rowsData.current[nextRowDataIndex.current] ?? EMPTY_ROW_DATA
      updateInstanceAttributesForRow(rowIndex, newRowData)
      nextRowDataIndex.current++
    }

    if (wrapsApplied > 0) {
      markInstanceAttributesDirty()
    }
  }

  function applyBackwardRowWraps(rowIndex: number, wrapsToApply: number): void {
    if (wrapsToApply <= 0) return
    let wrapsApplied = 0

    for (; wrapsApplied < wrapsToApply; wrapsApplied++) {
      hideRowDecorations(rowIndex)
      rowIsVisible.current[rowIndex] = false
      nextRowDataIndex.current = Math.max(0, nextRowDataIndex.current - 1)
      const earliestRowIndex = nextRowDataIndex.current - ROWS_RENDERED
      const newRowData =
        earliestRowIndex >= 0 ? rowsData.current[earliestRowIndex] : EMPTY_ROW_DATA
      updateInstanceAttributesForRow(rowIndex, newRowData)
    }

    if (wrapsApplied > 0) {
      markInstanceAttributesDirty()
    }
  }

  function updateRowPositions(rowIndex: number, rowZ: number) {
    const firstBodyIndex = rowIndex * COLUMNS
    const rigidBodies = instancedTilesRef.current?.rigidBodies
    if (!rigidBodies) return

    for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex++) {
      const body = rigidBodies[firstBodyIndex + columnIndex]
      if (!body) continue

      const bodyIndex = firstBodyIndex + columnIndex
      translation.current.x = xByBodyIndex.current[bodyIndex]
      const baseY = yByBodyIndex.current[bodyIndex]
      translation.current.y = baseY
      translation.current.z = rowZ
      body.setTranslation(translation.current, true)
    }
  }

  function updateTiles() {
    if (!instancedTilesRef.current?.rigidBodies) return
    const cycleDistance = ROWS_RENDERED * TILE_SIZE
    const minZ = MAX_Z - cycleDistance

    for (let rowIndex = 0; rowIndex < ROWS_RENDERED; rowIndex++) {
      let rowZ = baseZByRow.current[rowIndex] + currentScrollPosition.current
      let wraps = 0

      while (rowZ >= MAX_Z) {
        rowZ -= cycleDistance
        wraps++
      }

      while (rowZ < minZ) {
        rowZ += cycleDistance
        wraps--
      }

      const previousWraps = wrapCountByRow.current[rowIndex]
      if (wraps > previousWraps) {
        applyForwardRowWraps(rowIndex, wraps - previousWraps)
      } else if (wraps < previousWraps) {
        applyBackwardRowWraps(rowIndex, previousWraps - wraps)
      }
      wrapCountByRow.current[rowIndex] = wraps

      updateRowPositions(rowIndex, rowZ)
      rowZByIndex.current[rowIndex] = rowZ

      const wasVisible = rowIsVisible.current[rowIndex] === true
      const isVisible = rowZ >= ROW_VISIBILITY_THRESHOLD_Z
      if (wasVisible !== isVisible) {
        rowIsVisible.current[rowIndex] = isVisible
        if (isVisible) {
          positionRowDecorations(rowIndex, rowZ)
        } else {
          hideRowDecorations(rowIndex)
        }
      }

      updateStageForRow(rowIndex, rowZ)
    }
  }

  useGameFrame((_, delta) => {
    if (!hasInitialized.current) return [[]]
    if (!instancedTilesRef.current?.shader) return
    if (!homeElements.current || !infoElements.current) return

    instancedTilesRef.current.shader.uScrollZ = currentScrollPosition.current

    const inputDirectionZ = playerInput.current.up - playerInput.current.down
    const zStep = inputDirectionZ * TERRAIN_SPEED_UNITS * delta
    currentScrollPosition.current += zStep
    updateTiles()
    infoElements.current.moveElements(zStep)
    homeElements.current.moveElements(zStep)
  })

  if (!tileInstances.length) return null

  return (
    <group>
      <PlatformTiles
        ref={instancedTilesRef}
        instances={tileInstances}
        instanceVisibility={instanceVisibility.current!}
        instanceSeed={instanceSeed.current!}
        instanceIsHighlighted={instanceIsHighlighted.current!}
      />

      {/* Home Elements */}
      <HomeElements ref={homeElements} rowsData={rowsData} key={`${resetPlatformTick}-home`} />

      {/* Info Section Elements */}
      <InfoElements ref={infoElements} key={`${resetPlatformTick}-info`} />
    </group>
  )
}

export default Platform
