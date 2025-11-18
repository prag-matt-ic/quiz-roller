'use client'

import { type InstancedRigidBodyProps } from '@react-three/rapier'
import { type FC, useEffect, useRef, useState } from 'react'

import { Stage, useGameStore, useGameStoreAPI } from '@/components/GameProvider'
import HomeElements, { type HomeElementsHandle } from '@/components/platform/home/HomeElements'
import InfoElements, { type InfoElementsHandle } from '@/components/platform/info/InfoElements'
import { PlatformTiles, type InstancedTilesHandle } from '@/components/platform/tiles/Tiles'
import { useGameFrame } from '@/hooks/useGameFrame'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import useStage from '@/hooks/useStage'
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
  EPSILON,
  clamp,
  TERRAIN_SPEED_UNITS,
  lerp,
  RowData,
  ROWS_RENDERED,
  SAFE_HEIGHT,
  TILE_PLAYER_FADE_FULL_RADIUS,
  TILE_PLAYER_FADE_MIN_ALPHA,
  TILE_PLAYER_FADE_MIN_RADIUS,
  TILE_SIZE,
  UNSAFE_HEIGHT,
  ROW_VISIBILITY_HALF_SPAN,
} from '@/utils/tiles'
import usePlayerInput from '@/hooks/usePlayerInput'
import { INFO_ZONES_CONTENT } from '@/resources/content'

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

const FADE_FULL_RADIUS_SQ = TILE_PLAYER_FADE_FULL_RADIUS * TILE_PLAYER_FADE_FULL_RADIUS
const FADE_MIN_RADIUS_SQ = TILE_PLAYER_FADE_MIN_RADIUS * TILE_PLAYER_FADE_MIN_RADIUS
const ROW_FADE_DENOM = Math.max(EPSILON.SMALL, FADE_MIN_RADIUS_SQ - FADE_FULL_RADIUS_SQ)
const ROW_CYCLE_DISTANCE = ROWS_RENDERED * TILE_SIZE
const ROWS_COVERAGE_HALF_SPAN = (ROWS_RENDERED - 1) * TILE_SIZE * 0.5
const VISIBILITY_WINDOW_SPAN = ROW_VISIBILITY_HALF_SPAN * 2
const INITIAL_ROW_BACK_OFFSET_ROWS = 12
const INITIAL_ROW_BACK_OFFSET = INITIAL_ROW_BACK_OFFSET_ROWS * TILE_SIZE
const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

const warnVisibilityCoverageIfNeeded = (() => {
  let hasWarned = false
  return () => {
    if (hasWarned || !IS_DEV_ENV) return
    if (VISIBILITY_WINDOW_SPAN > ROW_CYCLE_DISTANCE) {
      console.warn(
        `[Platform] Visibility span (${VISIBILITY_WINDOW_SPAN.toFixed(
          2,
        )}) exceeds instanced coverage (${ROW_CYCLE_DISTANCE.toFixed(
          2,
        )}). Expect reduced buffer or inc rease ROWS_RENDERED.`,
      )
    }
    hasWarned = true
  }
})()

const logRowWrap = (direction: 'forward' | 'backward', rowIndex: number, wraps: number) => {
  if (!IS_DEV_ENV || wraps <= 0) return
  const action = direction === 'forward' ? 'advanced' : 'rewound'
  // console.warn(`[Platform] Row ${rowIndex} ${action} ${wraps} wrap(s).`)
}

function getRowAlpha(rowZ: number, playerZ: number) {
  const dz = rowZ - playerZ
  const distSq = dz * dz
  const fadeT = clamp((distSq - FADE_FULL_RADIUS_SQ) / ROW_FADE_DENOM, 0, 1)
  return lerp(1, TILE_PLAYER_FADE_MIN_ALPHA, fadeT)
}

const Platform: FC = () => {
  const gameStore = useGameStoreAPI()
  const resetPlatformTick = useGameStore((s) => s.resetPlatformTick)
  const goToStage = useGameStore((s) => s.goToStage)
  const setInfoContentIndex = useGameStore((s) => s.setInfoContentIndex)
  const stageRef = useStage()
  const stage = stageRef.current

  const { input: playerInput } = usePlayerInput()
  const { playerPosition } = usePlayerPosition()

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
  const initialRowStartZ = useRef(playerPosition.current.z + ROW_VISIBILITY_HALF_SPAN)

  // Precomputed row sequence
  const rowsData = useRef<RowData[]>([])
  const nextRowDataIndex = useRef(0)
  const activeRowsData = useRef<RowData[]>([])

  const homeElements = useRef<HomeElementsHandle | null>(null)
  const infoElements = useRef<InfoElementsHandle | null>(null)

  function insertInfoRows(contentIndex: 0 | 1 | 2) {
    const rows = generateInfoSectionRowData({
      contentIndex,
      isInfoOnLeft: INFO_ZONES_CONTENT[contentIndex]?.isInfoOnLeft ?? true,
    })
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

      const playerZ = playerPosition.current.z
      const initialHalfSpan = Math.min(ROW_VISIBILITY_HALF_SPAN, ROWS_COVERAGE_HALF_SPAN)
      const nextStartZ = playerZ + initialHalfSpan - INITIAL_ROW_BACK_OFFSET
      initialRowStartZ.current = nextStartZ
      if (IS_DEV_ENV) {
        console.warn(
          `[Platform] Initializing rows around playerZ=${playerZ.toFixed(
            2,
          )} with startZ=${nextStartZ.toFixed(2)} (halfSpan=${initialHalfSpan.toFixed(2)}).`,
        )
      }
      warnVisibilityCoverageIfNeeded()

      let nextRowZ = nextStartZ

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

  function setInfoContentIndexForVisibleRow(rowIndex: number) {
    const row = activeRowsData.current[rowIndex]
    if (!row) return
    if (row.type !== 'info' || !row.isSectionStart) return
    const contentIndex = row.infoContentIndex
    if (typeof contentIndex !== 'number') return
    const currentIndex = gameStore.getState().infoContentIndex
    if (currentIndex === contentIndex) return
    setInfoContentIndex(contentIndex)
  }

  function getStageDeterminingRowIndex() {
    let bestIndex = -1
    let smallestAbsZ = Infinity

    for (let rowIndex = 0; rowIndex < ROWS_RENDERED; rowIndex++) {
      const row = activeRowsData.current[rowIndex]
      if (!row || !row.isSectionStart) continue
      const rowZ = rowZByIndex.current[rowIndex]
      if (typeof rowZ !== 'number') continue

      const absZ = Math.abs(rowZ)
      if (absZ < smallestAbsZ) {
        smallestAbsZ = absZ
        bestIndex = rowIndex
      }
    }

    return bestIndex
  }

  function applyStageForRow(rowIndex: number) {
    const row = activeRowsData.current[rowIndex]
    if (!row || !row.isSectionStart) return

    if (row.type === 'home') {
      if (stage !== Stage.HOME) {
        goToStage(Stage.HOME)
      }
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

    if (row.type === 'obstacles') {
      if (stage !== Stage.TERRAIN) {
        goToStage(Stage.TERRAIN)
      }
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
      logRowWrap('forward', rowIndex, wrapsApplied)
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
      logRowWrap('backward', rowIndex, wrapsApplied)
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

  function updateTiles(playerZ: number) {
    if (!instancedTilesRef.current?.rigidBodies) return
    const cycleDistance = ROW_CYCLE_DISTANCE
    const maxZ = playerZ + ROW_VISIBILITY_HALF_SPAN
    const minZ = playerZ - ROW_VISIBILITY_HALF_SPAN

    for (let rowIndex = 0; rowIndex < ROWS_RENDERED; rowIndex++) {
      let rowZ = baseZByRow.current[rowIndex] + currentScrollPosition.current
      let wraps = 0

      while (rowZ >= maxZ) {
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
      const rowAlpha = getRowAlpha(rowZ, playerZ)
      const isVisible = rowAlpha > TILE_PLAYER_FADE_MIN_ALPHA
      if (wasVisible !== isVisible) {
        rowIsVisible.current[rowIndex] = isVisible
        if (isVisible) {
          setInfoContentIndexForVisibleRow(rowIndex)
          positionRowDecorations(rowIndex, rowZ)
        } else {
          hideRowDecorations(rowIndex)
        }
      }
    }

    const stageRowIndex = getStageDeterminingRowIndex()
    if (stageRowIndex >= 0) {
      applyStageForRow(stageRowIndex)
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
    const playerZ = playerPosition.current.z
    updateTiles(playerZ)
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
      <HomeElements
        ref={homeElements}
        rowsData={rowsData}
        rowStartZ={initialRowStartZ.current}
        key={`${resetPlatformTick}-home`}
      />

      {/* Info Section Elements */}
      <InfoElements ref={infoElements} key={`${resetPlatformTick}-info`} />
    </group>
  )
}

export default Platform
