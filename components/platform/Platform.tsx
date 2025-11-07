'use client'

import { type InstancedRigidBodyProps } from '@react-three/rapier'
import { type FC, startTransition, useEffect, useRef, useState } from 'react'

import { Stage, useGameStore } from '@/components/GameProvider'
import HomeElements, { type HomeElementsHandle } from '@/components/platform/home/HomeElements'
import QuestionElements, {
  type QuestionElementsHandle,
} from '@/components/platform/question/QuestionElements'
import { PlatformTiles, type InstancedTilesHandle } from '@/components/tiles/PlatformTiles'
import { useGameFrame } from '@/hooks/useGameFrame'
import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'
import { TERRAIN_SPEED_UNITS } from '@/resources/game'
import { generateHomeSectionRowData } from '@/utils/platform/homeSection'
import { generateIntroSectionRowData } from '@/utils/platform/introSection'
import { generateObstacleHeights } from '@/utils/platform/obstaclesSection'
import {
  DECEL_EASE_POWER,
  DECEL_START_OFFSET_ROWS,
  generateQuestionSectionRowData,
  OBSTACLE_BUFFER_SECTIONS,
  OBSTACLE_SECTION_ROWS,
  QUESTION_SECTION_ROWS,
  QUESTIONS_ENTRY_END_Z,
  QUESTIONS_ENTRY_START_Z,
  QUESTIONS_EXIT_END_Z,
  QUESTIONS_EXIT_START_Z,
} from '@/utils/platform/questionSection'
import {
  colToX,
  COLUMNS,
  ENTRY_Y_OFFSET,
  INITIAL_ROWS_Z_OFFSET,
  // INITIAL_ROWS_Z_OFFSET,
  MAX_Z,
  RowData,
  ROWS_VISIBLE,
  SAFE_HEIGHT,
  TILE_SIZE,
} from '@/utils/tiles'

const EPSILON = {
  SMALL: 1e-6,
  TINY: 1e-4,
} as const

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
  const isQuestionStage = stage === Stage.QUESTION
  const resetPlatformTick = useGameStore((s) => s.resetPlatformTick)
  const setTerrainSpeed = useGameStore((s) => s.setTerrainSpeed)
  const goToStage = useGameStore((s) => s.goToStage)
  const incrementDistanceRows = useGameStore((s) => s.incrementDistanceRows)

  const { terrainSpeed } = useTerrainSpeed()
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
  const questionElements = useRef<QuestionElementsHandle | null>(null)
  // Home Elements
  const homeElements = useRef<HomeElementsHandle | null>(null)

  // Question section speed deceleration state
  const questionSectionStartZ = useRef<number | null>(null)
  const questionSectionEndZ = useRef<number | null>(null)
  const initialSpeedAtSectionStart = useRef<number>(1)
  const isRowRaised = useRef<boolean[]>([])

  function insertQuestionRows() {
    const rows = generateQuestionSectionRowData()
    rowsData.current = [...rowsData.current, ...rows]
  }

  function insertHomeRows() {
    const rows = generateHomeSectionRowData()
    rowsData.current = [...rowsData.current, ...rows]
  }

  function insertIntroRows() {
    const rows = generateIntroSectionRowData()
    rowsData.current = [...rowsData.current, ...rows]
  }

  function getObstacleSectionRows(): RowData[] {
    const config: ObstacleGenerationConfig = {
      rows: OBSTACLE_SECTION_ROWS,
      seed: Math.floor(Math.random() * 1_000_000),
      ...DEFAULT_OBSTACLE_CONFIG,
    }

    const heights = generateObstacleHeights(config)
    return heights.map((columnHeights, rowIndex) => ({
      heights: columnHeights,
      type: 'obstacles' as const,
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === OBSTACLE_SECTION_ROWS - 1,
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

  function insertObstacleRows() {
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
      insertIntroRows()
      insertQuestionRows()
      insertObstacleRows()
      insertQuestionRows()
      insertObstacleRows()
      insertQuestionRows()
      insertObstacleRows()

      const instances: InstancedRigidBodyProps[] = []
      const totalInstances = ROWS_VISIBLE * COLUMNS
      instanceVisibility.current = new Float32Array(totalInstances)
      instanceSeed.current = new Float32Array(totalInstances)
      instanceAnswerNumber.current = new Float32Array(totalInstances)

      for (let rowIndex = 0; rowIndex < ROWS_VISIBLE; rowIndex++) {
        const rowData = rowsData.current[rowIndex]
        activeRowsData.current[rowIndex] = rowData
        baseZByRow.current[rowIndex] = -rowIndex * TILE_SIZE + INITIAL_ROWS_Z_OFFSET
        wrapCountByRow.current[rowIndex] = 0

        for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex++) {
          const x = colToX(columnIndex)
          const z = -rowIndex * TILE_SIZE + INITIAL_ROWS_Z_OFFSET
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
      }

      setTileInstances(instances)
      hasInitialized.current = true
      nextRowDataIndex.current = ROWS_VISIBLE
    }

    setupInitialRowsAndInstances()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetPlatformTick])

  useEffect(() => {
    if (stage === Stage.TERRAIN) {
      resetQuestionSectionDeceleration()
    }
  }, [stage])

  function applyRowWraps(rowIndex: number, wrapsToApply: number) {
    for (let wrapCount = 0; wrapCount < wrapsToApply; wrapCount++) {
      const currentRowData = activeRowsData.current[rowIndex]

      if (currentRowData.type === 'obstacles' && currentRowData.isSectionEnd) {
        insertObstacleRows()
      }

      if (currentRowData.type === 'question' && currentRowData.isSectionEnd) {
        insertQuestionRows()
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

  function computeTerrainSpeedForQuestionSection(): number {
    const startZ = questionSectionStartZ.current
    const targetScrollZ = questionSectionEndZ.current
    const currentScrollZ = currentScrollPosition.current

    if (startZ === null || targetScrollZ === null) {
      return terrainSpeed.current
    }

    if (currentScrollZ < startZ) {
      return terrainSpeed.current
    }

    if (currentScrollZ >= targetScrollZ) {
      return 0
    }

    const progress = (currentScrollZ - startZ) / (targetScrollZ - startZ)
    const normalizedProgress = Math.max(0, Math.min(1, progress))
    const easedSpeed = 1 - Math.pow(normalizedProgress, DECEL_EASE_POWER)
    return easedSpeed
  }

  function resetQuestionSectionDeceleration() {
    questionSectionStartZ.current = null
    questionSectionEndZ.current = null
    initialSpeedAtSectionStart.current = 1
  }

  function computeLiftLowerOffset(rowZ: number): number {
    // Entry lift: raise from -ENTRY_Y_OFFSET up to 0 across the entry window
    if (rowZ < QUESTIONS_ENTRY_START_Z) return -ENTRY_Y_OFFSET
    if (rowZ < QUESTIONS_ENTRY_END_Z) {
      const tIn =
        (rowZ - QUESTIONS_ENTRY_START_Z) / (QUESTIONS_ENTRY_END_Z - QUESTIONS_ENTRY_START_Z)
      return -ENTRY_Y_OFFSET * (1 - tIn)
    }
    // Exit lower: lower from 0 down to -ENTRY_Y_OFFSET across the exit window
    if (rowZ >= QUESTIONS_EXIT_START_Z && rowZ < QUESTIONS_EXIT_END_Z) {
      const tOut =
        (rowZ - QUESTIONS_EXIT_START_Z) / (QUESTIONS_EXIT_END_Z - QUESTIONS_EXIT_START_Z)
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
    questionElements.current!.positionElementsIfNeeded(rowMetadata, rowZ)

    const isQuestionSectionStart =
      rowMetadata?.type === 'question' && rowMetadata.isSectionStart && !isQuestionStage

    if (isQuestionSectionStart) {
      const currentScrollZ = currentScrollPosition.current
      const endScrollZ = currentScrollZ + (QUESTION_SECTION_ROWS - 1) * TILE_SIZE
      const delayedStartScrollZ = currentScrollZ + DECEL_START_OFFSET_ROWS * TILE_SIZE

      questionSectionStartZ.current = Math.min(delayedStartScrollZ, endScrollZ - EPSILON.TINY)
      questionSectionEndZ.current = endScrollZ
      initialSpeedAtSectionStart.current = terrainSpeed.current
      goToStage(Stage.QUESTION)
    }
  }

  function updateTiles() {
    if (!instancedTilesRef.current?.rigidBodies) return
    const cycleDistance = ROWS_VISIBLE * TILE_SIZE

    for (let rowIndex = 0; rowIndex < ROWS_VISIBLE; rowIndex++) {
      let rowZ = baseZByRow.current[rowIndex] + currentScrollPosition.current
      let wraps = 0

      while (rowZ >= MAX_Z) {
        rowZ -= cycleDistance
        wraps++
      }

      const previousWraps = wrapCountByRow.current[rowIndex]
      if (wraps > previousWraps) {
        applyRowWraps(rowIndex, wraps - previousWraps)
        wrapCountByRow.current[rowIndex] = wraps
      }

      const yOffset = computeLiftLowerOffset(rowZ)
      updateRowPositions(rowIndex, rowZ, yOffset)

      const wasRaised = isRowRaised.current[rowIndex] === true
      const isRaised = rowZ >= QUESTIONS_ENTRY_END_Z

      if (!wasRaised && isRaised) {
        handleRowRaised(rowIndex, rowZ)
      }
    }
  }

  useGameFrame((_, delta) => {
    if (!hasInitialized.current) return
    if (!instancedTilesRef.current?.shader) return
    if (!homeElements.current || !questionElements.current) return
    if (stage === Stage.GAME_OVER || stage === Stage.HOME) return

    instancedTilesRef.current.shader.uScrollZ = currentScrollPosition.current

    let computedSpeed = terrainSpeed.current

    if (stage === Stage.QUESTION) {
      computedSpeed = computeTerrainSpeedForQuestionSection()
    }

    if (computedSpeed !== terrainSpeed.current) {
      setTerrainSpeed(computedSpeed)
    }

    const zStep = computedSpeed * TERRAIN_SPEED_UNITS * delta
    currentScrollPosition.current += zStep
    updateTiles()
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
      <QuestionElements ref={questionElements} key={`${resetPlatformTick}-question`} />
    </group>
  )
}

export default Platform
