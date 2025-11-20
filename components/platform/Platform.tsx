'use client'

import { type InstancedRigidBodyProps } from '@react-three/rapier'
import { type FC, useCallback, useEffect, useRef, useState } from 'react'

import { Stage, useGameStore, useGameStoreAPI } from '@/components/GameProvider'
import HomeElements, { type HomeElementsHandle } from '@/components/platform/home/HomeElements'
import InfoElements, { type InfoElementsHandle } from '@/components/platform/info/InfoElements'
import { PlatformTiles, type TilesHandle } from '@/components/platform/tiles/Tiles'
import CTAElements, { type CTAElementsHandle } from '@/components/platform/cta/CTAElements' // changed from lowercase and wont allow name CTAElements
import Rings, { type RingsHandle } from '@/components/platform/rings/Rings'
import { useGameFrame } from '@/hooks/useGameFrame'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import useStage from '@/hooks/useStage'
import { generateHomeSectionRowData } from '@/utils/platform/homeSection'
import { generateObstacleSectionRowData } from '@/utils/platform/obstaclesSection'
import { generateInfoSectionRowData } from '@/utils/platform/infoSection'
import { generateSpeedRunSectionRowData } from '@/utils/platform/speedRunSection'
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
import { generateCtaSectionRowData } from '@/utils/platform/ctaSection'

const EMPTY_ROW_DATA: RowData = {
  heights: Array.from({ length: COLUMNS }, () => UNSAFE_HEIGHT),
  type: 'empty',
  isSectionStart: false,
  isSectionEnd: false,
  rowIndex: -1,
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

function getRowAlpha(rowZ: number, playerZ: number) {
  const dz = rowZ - playerZ
  const distSq = dz * dz
  const fadeT = clamp((distSq - FADE_FULL_RADIUS_SQ) / ROW_FADE_DENOM, 0, 1)
  return lerp(1, TILE_PLAYER_FADE_MIN_ALPHA, fadeT)
}

type Props = {
  homeBitmap: HTMLImageElement | null
  infoBitmaps: Array<HTMLImageElement | null>
  obstacleBitmaps: Array<HTMLImageElement | null>
  speedRunBitmap: HTMLImageElement | null
  ctaBitmap: HTMLImageElement | null
}

const Platform: FC<Props> = ({
  homeBitmap,
  infoBitmaps,
  obstacleBitmaps,
  speedRunBitmap,
  ctaBitmap,
}) => {
  const gameStore = useGameStoreAPI()
  const resetPlatformTick = useGameStore((s) => s.resetPlatformTick)
  const isPlatformReady = useGameStore((s) => s.isPlatformReady)
  const setPlatformReady = useGameStore((s) => s.setPlatformReady)
  const goToStage = useGameStore((s) => s.goToStage)
  const setInfoContentIndex = useGameStore((s) => s.setInfoContentIndex)
  const setTotalRows = useGameStore((s) => s.setTotalRows)
  const setCurrentRow = useGameStore((s) => s.setCurrentRow)
  const isSpeedRunMode = useGameStore((s) => s.isSpeedRunMode)
  const stageRef = useStage()

  const { input: playerInput } = usePlayerInput()
  const { playerPosition } = usePlayerPosition()

  // Deterministic scrolling state
  const currentScrollPosition = useRef(0)
  const baseZByRow = useRef<number[]>([])
  const wrapCountByRow = useRef<number[]>([])
  const rowZByIndex = useRef<number[]>([])
  const rowIsVisible = useRef<boolean[]>([])
  const xByBodyIndex = useRef<number[]>([])
  const yByBodyIndex = useRef<number[]>([])

  const translation = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })

  // Precomputed row sequence
  const rowsData = useRef<RowData[]>([])
  const nextRowDataIndex = useRef(0)
  const activeRowsData = useRef<RowData[]>([])
  const nextAbsoluteRowIndex = useRef(0)

  const tilesHandle = useRef<TilesHandle | null>(null)
  const homeElements = useRef<HomeElementsHandle | null>(null)
  const infoElements = useRef<InfoElementsHandle | null>(null)
  const ctaElements = useRef<CTAElementsHandle | null>(null)
  const ringsHandle = useRef<RingsHandle | null>(null)

  const [readyState, setReadyState] = useState({
    tiles: false,
    rings: false,
    home: false,
    info: false,
    cta: false,
  })

  const onTilesReadyChange = useCallback((isReady: boolean) => {
    setReadyState((prev) => ({ ...prev, tiles: isReady }))
  }, [])

  const onRingsReadyChange = useCallback((isReady: boolean) => {
    setReadyState((prev) => ({ ...prev, rings: isReady }))
  }, [])

  const onHomeElementsReadyChange = useCallback((isReady: boolean) => {
    setReadyState((prev) => ({ ...prev, home: isReady }))
  }, [])

  const onInfoElementsReadyChange = useCallback((isReady: boolean) => {
    setReadyState((prev) => ({ ...prev, info: isReady }))
  }, [])

  const onCtaElementsReadyChange = useCallback((isReady: boolean) => {
    setReadyState((prev) => ({ ...prev, cta: isReady }))
  }, [])

  const appendRowsWithIndices = (rows: RowData[]) => {
    // Ensures rows have absolute rowIndex assigned
    if (!rows.length) return
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      row.rowIndex = nextAbsoluteRowIndex.current
      nextAbsoluteRowIndex.current++
      rowsData.current.push(row)
    }
  }

  function insertInfoRows(contentIndex: 0 | 1 | 2) {
    const bitmap = infoBitmaps[contentIndex] ?? null
    if (!bitmap) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn(
          `[Platform] Cannot insert info rows for index ${contentIndex} without a bitmap image`,
        )
      }
      return
    }
    const rows = generateInfoSectionRowData({
      bitmap,
      contentIndex,
    })
    appendRowsWithIndices(rows)
  }

  function insertHomeRows() {
    const rows = generateHomeSectionRowData(homeBitmap)
    if (!rows.length && process.env.NODE_ENV !== 'production') {
      console.warn('[Platform] No home rows were generated from the bitmap')
    }
    appendRowsWithIndices(rows)
  }

  function insertObstacleRows(bitmapIndex: number) {
    const bitmap = obstacleBitmaps[bitmapIndex] ?? null
    const rows = generateObstacleSectionRowData(bitmap)
    appendRowsWithIndices(rows)
  }

  function insertCtaRows() {
    const rows = generateCtaSectionRowData(ctaBitmap)
    appendRowsWithIndices(rows)
  }

  function insertSpeedRunRows() {
    const rows = generateSpeedRunSectionRowData(speedRunBitmap)
    appendRowsWithIndices(rows)
  }

  useEffect(() => {
    if (!homeBitmap || !infoBitmaps.length) return // TODO: add a check for all bitmaps.
    if (Object.values(readyState).some((v) => v === false)) return

    if (!tilesHandle.current) {
      console.error('[Platform] Missing tiles handle when initializing platform.')
      return
    }

    const tiles = tilesHandle.current

    function setupInitialRowsAndTiles() {
      // Reset state
      rowsData.current = []
      nextAbsoluteRowIndex.current = 0
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
      insertObstacleRows(0)

      if (!isSpeedRunMode) {
        insertInfoRows(0)
        insertObstacleRows(1)
        insertInfoRows(1)
        insertObstacleRows(2)
        insertInfoRows(2)
        insertObstacleRows(3)
        insertCtaRows()
      } else {
        insertSpeedRunRows()
      }

      setTotalRows(nextAbsoluteRowIndex.current)

      const tileInstances: InstancedRigidBodyProps[] = []

      const playerZ = playerPosition.current.z
      const initialHalfSpan = Math.min(ROW_VISIBILITY_HALF_SPAN, ROWS_COVERAGE_HALF_SPAN)
      const nextStartZ = playerZ + initialHalfSpan - INITIAL_ROW_BACK_OFFSET
      if (IS_DEV_ENV) {
        console.warn(
          `[Platform] Initializing rows around playerZ=${playerZ.toFixed(
            2,
          )} with startZ=${nextStartZ.toFixed(2)} (halfSpan=${initialHalfSpan.toFixed(2)}).`,
        )
      }
      warnVisibilityCoverageIfNeeded()

      let nextRowZ = nextStartZ

      const tilesVisibility = tiles.visibilityData
      const tilesSeed = tiles.seedData
      const tilesHighlighted = tiles.highlightedData

      if (!tilesVisibility || !tilesSeed || !tilesHighlighted) {
        console.error('[Platform] Missing tile instance attributes data.')
        return
      }

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

          tilesVisibility![bodyIndex] = y >= SAFE_HEIGHT ? 1 : 0
          tilesSeed![bodyIndex] = Math.random()
          tilesHighlighted![bodyIndex] = rowData.isHighlighted?.[columnIndex] ?? 0

          tileInstances.push({
            key: `tile-${rowIndex}-${columnIndex}`,
            position: [x, y, z],
            userData: { type: 'tile', rowIndex, colIndex: columnIndex },
          })
        }

        nextRowZ -= TILE_SIZE
      }

      tiles.setTileInstances(tileInstances)
      setPlatformReady(true)
      nextRowDataIndex.current = ROWS_RENDERED
      markInstanceAttributesDirty()
    }

    setupInitialRowsAndTiles()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetPlatformTick, homeBitmap, infoBitmaps, speedRunBitmap, ctaBitmap, readyState])

  function updateInstanceAttributesForRow(rowIndex: number, newRowData?: RowData) {
    const data = newRowData ?? EMPTY_ROW_DATA
    const visibilityData = tilesHandle.current?.visibilityData
    const highlightedData = tilesHandle.current?.highlightedData
    if (!visibilityData || !highlightedData) return
    activeRowsData.current[rowIndex] = data

    for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex++) {
      const bodyIndex = rowIndex * COLUMNS + columnIndex
      const y = data.heights[columnIndex]
      yByBodyIndex.current[bodyIndex] = y
      visibilityData[bodyIndex] = y >= SAFE_HEIGHT ? 1 : 0
      highlightedData[bodyIndex] = data.isHighlighted?.[columnIndex] ?? 0
    }
  }

  function markInstanceAttributesDirty() {
    if (tilesHandle.current?.visibilityAttribute) {
      tilesHandle.current.visibilityAttribute.needsUpdate = true
    }
    if (tilesHandle.current?.highlightedAttribute) {
      tilesHandle.current.highlightedAttribute.needsUpdate = true
    }
  }

  function hideRowDecorations(rowIndex: number) {
    const row = activeRowsData.current[rowIndex]
    if (!row) return
    ringsHandle.current?.hideElementsIfNeeded(row)
    switch (row.type) {
      case 'info':
        infoElements.current?.hideElementsIfNeeded(row)
        break
      case 'home':
        homeElements.current?.hideElementsIfNeeded(row)
        break
      case 'cta':
        ctaElements.current?.hideElementsIfNeeded(row)
        break
      default:
        break
    }
  }

  function positionRowDecorations(rowIndex: number, rowZ: number) {
    const row = activeRowsData.current[rowIndex]
    if (!row) return
    positionRingElements(row, rowZ, rowIndex)
    switch (row.type) {
      case 'info':
        infoElements.current?.positionElementsIfNeeded(row, rowZ)
        break
      case 'home':
        homeElements.current?.positionElementsIfNeeded(row, rowZ)
        break
      case 'cta':
        ctaElements.current?.positionElementsIfNeeded(row, rowZ)
        break
      default:
        break
    }
  }

  const positionRingElements = (row: RowData, rowZ: number, rowIndex: number) => {
    if (!ringsHandle.current) return
    ringsHandle.current.positionElementsIfNeeded(row, rowZ)
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

  function getRowIndexClosestToOrigin() {
    let bestIndex = -1
    let smallestAbsZ = Infinity

    for (let rowIndex = 0; rowIndex < ROWS_RENDERED; rowIndex++) {
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

  function updateCurrentRowState(rowIndex: number) {
    const currentRowIndex = activeRowsData.current[rowIndex]?.rowIndex ?? 0
    setCurrentRow(currentRowIndex)
  }

  function applyStageForRow(rowIndex: number) {
    const row = activeRowsData.current[rowIndex]
    if (!row) return

    if (row.type === 'home') {
      if (stageRef.current !== Stage.HOME) {
        goToStage(Stage.HOME)
      }
      return
    }

    if (row.type === 'info') {
      const contentIndex = row.infoContentIndex ?? 0
      setInfoContentIndex(contentIndex)
      if (stageRef.current !== Stage.INFO) {
        goToStage(Stage.INFO)
      }
      return
    }

    if (row.type === 'obstacles') {
      if (stageRef.current !== Stage.TERRAIN) {
        goToStage(Stage.TERRAIN)
      }
      return
    }

    if (row.type === 'cta' && stageRef.current !== Stage.CTA) {
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
    const rigidBodies = tilesHandle.current?.rigidBodies
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
    if (!tilesHandle.current?.rigidBodies) return
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

    const stageRowIndex = getRowIndexClosestToOrigin()
    if (stageRowIndex >= 0) {
      applyStageForRow(stageRowIndex)
      updateCurrentRowState(stageRowIndex)
    }
  }

  useGameFrame((_, delta) => {
    if (!isPlatformReady) return
    if (!tilesHandle.current?.shader) return
    if (
      !homeElements.current ||
      !infoElements.current ||
      !ctaElements.current ||
      !ringsHandle.current
    )
      return

    tilesHandle.current.shader.uScrollZ = currentScrollPosition.current

    const inputDirectionZ = playerInput.current.up - playerInput.current.down

    const zStep = inputDirectionZ * TERRAIN_SPEED_UNITS * delta
    currentScrollPosition.current += zStep
    const playerZ = playerPosition.current.z
    updateTiles(playerZ)

    if (zStep === 0) return
    infoElements.current.moveElements(zStep)
    homeElements.current.moveElements(zStep)
    ctaElements.current.moveElements(zStep)
    ringsHandle.current.moveElements(zStep)
  })

  useEffect(() => {
    setPlatformReady(false)
  }, [resetPlatformTick, setPlatformReady])

  return (
    <group>
      <PlatformTiles
        ref={tilesHandle}
        key={`${resetPlatformTick}-tiles`}
        onReadyChange={onTilesReadyChange}
      />

      <Rings
        ref={ringsHandle}
        key={`${resetPlatformTick}-rings`}
        onReadyChange={onRingsReadyChange}
      />

      <HomeElements
        ref={homeElements}
        key={`${resetPlatformTick}-home`}
        onReadyChange={onHomeElementsReadyChange}
      />

      <InfoElements
        ref={infoElements}
        key={`${resetPlatformTick}-info`}
        onReadyChange={onInfoElementsReadyChange}
      />

      <CTAElements
        ref={ctaElements}
        key={`${resetPlatformTick}-cta`}
        onReadyChange={onCtaElementsReadyChange}
      />

      {/* If speed-run: Show Speed Run Elements */}
    </group>
  )
}

export default Platform
