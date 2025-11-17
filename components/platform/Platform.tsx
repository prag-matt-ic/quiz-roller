'use client'

import { type InstancedRigidBodyProps } from '@react-three/rapier'
import { type FC, startTransition, useEffect, useRef, useState } from 'react'

import { Stage, useGameStore } from '@/components/GameProvider'
import HomeElements, { type HomeElementsHandle } from '@/components/platform/home/HomeElements'
import InfoElements, {
  type InfoElementsHandle,
} from '@/components/platform/info/InfoElements'
import { PlatformTiles, type InstancedTilesHandle } from '@/components/platform/tiles/Tiles'
import { useGameFrame } from '@/hooks/useGameFrame'
import { generateHomeSectionRowData } from '@/utils/platform/homeSection'
import { generateObstacleHeights } from '@/utils/platform/obstaclesSection'
import {
  FIRST_OBSTACLE_SECTION_ROWS,
  generateInfoSectionRowData,
  OBSTACLE_BUFFER_SECTIONS,
  OBSTACLE_SECTION_ROWS,
  INFO_SECTION_ROWS,
} from '@/utils/platform/infoSection'
import {
  colToX,
  COLUMNS,
  TERRAIN_SPEED_UNITS,
  ENTRY_Y_OFFSET,
  INITIAL_ROWS_Z_OFFSET,
  ENTRY_END_Z,
  MAX_Z,
  RowData,
  ROWS_RENDERED,
  SAFE_HEIGHT,
  TILE_SIZE,
  ENTRY_START_Z,
  EPSILON,
  EXIT_START_Z,
  EXIT_END_Z,
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

const Platform: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const isInfoStage = stage === Stage.INFO
  const resetPlatformTick = useGameStore((s) => s.resetPlatformTick)
  const goToStage = useGameStore((s) => s.goToStage)
  const incrementDistanceRows = useGameStore((s) => s.incrementDistanceRows)

  const { input: playerInput } = usePlayerInput()

  const instancedTilesRef = useRef<InstancedTilesHandle>(null)
  const [tileInstances, setTileInstances] = useState<InstancedRigidBodyProps[]>([])
  const hasInitialized = useRef(false)

  // Deterministic scrolling state
  const currentScrollPosition = useRef(0)
  const baseZByRow = useRef<number[]>([])
  const wrapCountByRow = useRef<number[]>([])
  const xByBodyIndex = useRef<number[]>([])
  const yByBodyIndex = useRef<number[]>([])

  // Per-instance GPU attributes
  const instanceSeed = useRef<Float32Array | null>(null)
  const instanceVisibility = useRef<Float32Array | null>(null)
  const instanceAnswerNumber = useRef<Float32Array | null>(null)

  const translation = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })

  // Obstacle section precomputation buffer
  const obstacleSectionBuffer = useRef<RowData[][]>([])
  const isObstacleTopUpScheduled = useRef(false)

  // Precomputed row sequence
  const rowsData = useRef<RowData[]>([])
  const nextRowDataIndex = useRef(0)
  const activeRowsData = useRef<RowData[]>([])

  // Question Elements
  const infoElements = useRef<InfoElementsHandle | null>(null)
  // Home Elements
  const homeElements = useRef<HomeElementsHandle | null>(null)

  const isRowRaised = useRef<boolean[]>([])

  function insertInfoRows() {
    const rows = generateInfoSectionRowData()
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

  function topUpObstacleBuffer(count: number) {
    for (let i = 0; i < count; i++) {
      obstacleSectionBuffer.current.push(getObstacleSectionRows())
    }
  }

  function scheduleObstacleTopUpIfNeeded() {
    if (isObstacleTopUpScheduled.current) return
    if (obstacleSectionBuffer.current.length > OBSTACLE_BUFFER_SECTIONS) return

    isObstacleTopUpScheduled.current = true
    startTransition(() => {
      const needed = OBSTACLE_BUFFER_SECTIONS - obstacleSectionBuffer.current.length
      if (needed > 0) topUpObstacleBuffer(needed)
      isObstacleTopUpScheduled.current = false
    })
  }

  function insertObstacleRows(rows?: number) {
    if (typeof rows === 'number') {
      const blocks = getObstacleSectionRows(rows)
      rowsData.current = [...rowsData.current, ...blocks]
      scheduleObstacleTopUpIfNeeded()
      return
    }

    const blocks = obstacleSectionBuffer.current.shift() ?? getObstacleSectionRows()
    rowsData.current = [...rowsData.current, ...blocks]
    scheduleObstacleTopUpIfNeeded()
  }

  useEffect(() => {
    function setupInitialRowsAndInstances() {
      topUpObstacleBuffer(OBSTACLE_BUFFER_SECTIONS)

      // Reset state
      rowsData.current = []
      nextRowDataIndex.current = 0
      activeRowsData.current = []
      baseZByRow.current = []
      wrapCountByRow.current = []
      xByBodyIndex.current = []
      yByBodyIndex.current = []
      isRowRaised.current = []
      currentScrollPosition.current = 0

      insertHomeRows()
      insertObstacleRows(FIRST_OBSTACLE_SECTION_ROWS)
      insertInfoRows()
      insertObstacleRows()
      insertInfoRows()
      insertObstacleRows()
      insertInfoRows()
      insertObstacleRows()

      const instances: InstancedRigidBodyProps[] = []
      const totalInstances = ROWS_RENDERED * COLUMNS
      instanceVisibility.current = new Float32Array(totalInstances)
      instanceSeed.current = new Float32Array(totalInstances)
      instanceAnswerNumber.current = new Float32Array(totalInstances)

      let nextRowZ = INITIAL_ROWS_Z_OFFSET

      for (let rowIndex = 0; rowIndex < ROWS_RENDERED; rowIndex++) {
        const rowData = rowsData.current[rowIndex]
        activeRowsData.current[rowIndex] = rowData
        baseZByRow.current[rowIndex] = nextRowZ
        wrapCountByRow.current[rowIndex] = 0

        for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex++) {
          const x = colToX(columnIndex)
          const z = nextRowZ
          const y = rowData.heights[columnIndex]
          const bodyIndex = rowIndex * COLUMNS + columnIndex
          xByBodyIndex.current[bodyIndex] = x
          yByBodyIndex.current[bodyIndex] = y

          instanceVisibility.current[bodyIndex] = y === SAFE_HEIGHT ? 1 : 0
          instanceSeed.current[bodyIndex] = Math.random()
          instanceAnswerNumber.current[bodyIndex] = rowData.answerNumber?.[columnIndex] ?? 0

          instances.push({
            key: `terrain-${rowIndex}-${columnIndex}`,
            position: [x, y, z],
            userData: { type: 'terrain', rowIndex, colIndex: columnIndex },
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

  useEffect(() => {
    if (stage === Stage.TERRAIN) {
      resetInfoSectionDeceleration()
    }
  }, [stage])

  function applyRowWraps(rowIndex: number, wrapsToApply: number) {
    for (let wrapCount = 0; wrapCount < wrapsToApply; wrapCount++) {
      const currentRowData = activeRowsData.current[rowIndex]

      if (currentRowData.type === 'obstacles' && currentRowData.isSectionEnd) {
        insertObstacleRows()
      }

      if (currentRowData.type === 'info' && currentRowData.isSectionEnd) {
        // insertInfoRows()
      }

      const newRowData = rowsData.current[nextRowDataIndex.current]
      activeRowsData.current[rowIndex] = newRowData
      nextRowDataIndex.current++

      for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex++) {
        const bodyIndex = rowIndex * COLUMNS + columnIndex
        yByBodyIndex.current[bodyIndex] = newRowData.heights[columnIndex]
        const y = newRowData.heights[columnIndex]
        instanceVisibility.current![bodyIndex] = y === SAFE_HEIGHT ? 1 : 0
        instanceAnswerNumber.current![bodyIndex] = newRowData.answerNumber?.[columnIndex] ?? 0
      }

      if (instancedTilesRef.current?.visibilityAttribute) {
        instancedTilesRef.current.visibilityAttribute.needsUpdate = true
      }
      if (instancedTilesRef.current?.answerNumberAttribute) {
        instancedTilesRef.current.answerNumberAttribute.needsUpdate = true
      }

      incrementDistanceRows(1)
    }

    if (wrapsToApply > 0) {
      isRowRaised.current[rowIndex] = false
    }
  }

  function resetInfoSectionDeceleration() {
    infoSectionStartZ.current = null
    infoSectionEndZ.current = null
    initialSpeedAtSectionStart.current = 1
  }

  function computeLiftLowerOffset(rowZ: number): number {
    // Entry lift: raise from -ENTRY_Y_OFFSET up to 0 across the entry window
    if (rowZ < ENTRY_START_Z) return -ENTRY_Y_OFFSET
    if (rowZ < ENTRY_END_Z) {
      const tIn = (rowZ - ENTRY_START_Z) / (ENTRY_END_Z - ENTRY_START_Z)
      return -ENTRY_Y_OFFSET * (1 - tIn)
    }
    // Exit lower: lower from 0 down to -ENTRY_Y_OFFSET across the exit window
    if (rowZ >= EXIT_START_Z && rowZ < EXIT_END_Z) {
      const tOut = (rowZ - EXIT_START_Z) / (EXIT_END_Z - EXIT_START_Z)
      return ENTRY_Y_OFFSET * tOut
    }
    // Otherwise, tiles are flat at y=0
    return 0
  }

  function updateRowPositions(rowIndex: number, rowZ: number, yOffset: number) {
    const firstBodyIndex = rowIndex * COLUMNS
    const rigidBodies = instancedTilesRef.current?.rigidBodies
    if (!rigidBodies) return

    for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex++) {
      const body = rigidBodies[firstBodyIndex + columnIndex]
      if (!body) continue

      const bodyIndex = firstBodyIndex + columnIndex
      translation.current.x = xByBodyIndex.current[bodyIndex]
      const baseY = yByBodyIndex.current[bodyIndex]
      translation.current.y = baseY === SAFE_HEIGHT ? baseY + yOffset : baseY
      translation.current.z = rowZ
      body.setTranslation(translation.current, true)
    }
  }

  function handleRowRaised(rowIndex: number, rowZ: number) {
    const rowMetadata = activeRowsData.current[rowIndex]

    isRowRaised.current[rowIndex] = true
    infoElements.current!.positionElementsIfNeeded(rowMetadata, rowZ)

    const isInfoSectionStart =
      rowMetadata?.type === 'question' && rowMetadata.isSectionStart && !isInfoStage

    if (isQuestionSectionStart) {
      goToStage(Stage.QUESTION)
    }
  }

  function handleRowLowered(rowIndex: number) {
    isRowRaised.current[rowIndex] = false
    questionElements.current?.hideElementsIfNeeded(activeRowsData.current[rowIndex])
  }

  function updateTiles(zStep: number) {
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
        applyRowWraps(rowIndex, wraps - previousWraps)
        wrapCountByRow.current[rowIndex] = wraps
      }

      const yOffset = computeLiftLowerOffset(rowZ)
      updateRowPositions(rowIndex, rowZ, yOffset)

      const wasRaised = isRowRaised.current[rowIndex] === true
      const isRaised = rowZ >= ENTRY_END_Z

      if (!wasRaised && isRaised) {
        handleRowRaised(rowIndex, rowZ)
      }

      if (wasRaised && !isRaised) {
        handleRowLowered(rowIndex)
      }
    }
  }

  useGameFrame((_, delta) => {
    if (!hasInitialized.current) return
    if (!instancedTilesRef.current?.shader) return
    if (!homeElements.current || !infoElements.current) return

    instancedTilesRef.current.shader.uScrollZ = currentScrollPosition.current

    const inputDirectionZ = playerInput.current.up - playerInput.current.down
    const zStep = inputDirectionZ * TERRAIN_SPEED_UNITS * delta
    currentScrollPosition.current += zStep
    updateTiles(zStep)
    questionElements.current.moveElements(zStep)
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
        instanceAnswerNumber={instanceAnswerNumber.current!}
      />

      {/* Home Elements */}
      <HomeElements ref={homeElements} rowsData={rowsData} key={`${resetPlatformTick}-home`} />

      {/* Question Elements */}
      <InfoElements ref={infoElements} key={`${resetPlatformTick}-question`} />
    </group>
  )
}

export default Platform
