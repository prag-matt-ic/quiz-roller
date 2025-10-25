/* eslint-disable simple-import-sort/imports */
'use client'

import { createRef, type FC, startTransition, useEffect, useRef, useState } from 'react'
import { InstancedRigidBodyProps, type RapierRigidBody } from '@react-three/rapier'
import { type Group } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'
import { Text } from '@/components/Text'
import { QuestionAnswerTile } from '@/components/answerTile/AnswerTile'
import { TERRAIN_SPEED_UNITS } from '@/resources/game'
import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'
import { useGameFrame } from '@/hooks/useGameFrame'

import { InstancedTiles, type InstancedTilesHandle } from '../tiles/InstancedTiles'
import { COLUMNS, ROWS_VISIBLE, SAFE_HEIGHT, TILE_SIZE, colToX } from '@/utils/tiles'

import {
  ANSWER_TILE_COUNT,
  DECEL_EASE_POWER,
  DECEL_START_OFFSET_ROWS,
  ENTRY_Y_OFFSET,
  QUESTIONS_ENTRY_END_Z,
  QUESTIONS_ENTRY_START_Z,
  QUESTIONS_EXIT_END_Z,
  QUESTIONS_EXIT_START_Z,
  INITIAL_ROWS_Z_OFFSET,
  MAX_Z,
  OBSTACLE_BUFFER_SECTIONS,
  OBSTACLE_SECTION_ROWS,
  QUESTION_SECTION_ROWS,
  type RowData,
  generateQuestionSectionRowData,
  generateIntroSectionRowData,
  QUESTION_TEXT_WIDTH,
  QUESTION_TEXT_HEIGHT,
} from '@/utils/terrainBuilder'

import { generateObstacleHeights } from '@/utils/obstacles'

const EPSILON = {
  SMALL: 1e-6,
  TINY: 1e-4,
} as const

const HIDE_POSITION = {
  QUESTION_Y: -40,
  QUESTION_Z: 40,
  ANSWER_Y: -100,
  ANSWER_Z: -100,
} as const

const INITIAL_QUESTION_POSITION = {
  Y: 0.01,
  Z: -999,
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

// The Topic Run begins after a user has selected a topic in the Home stage.

const TopicRun: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const isQuestionStage = stage === Stage.QUESTION
  const currentQuestion = useGameStore((s) => s.currentQuestion)
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
  const hasCompletedIntro = useRef(false)

  // Question/answers instance refs
  const questionGroup = useRef<Group>(null)
  const answerRefs = useRef(
    Array.from({ length: ANSWER_TILE_COUNT }, () => createRef<RapierRigidBody>()),
  ).current

  // Question section speed deceleration state
  const questionSectionStartZ = useRef<number | null>(null)
  const questionSectionEndZ = useRef<number | null>(null)
  const initialSpeedAtSectionStart = useRef<number>(1)
  const isRowRaised = useRef<boolean[]>([])

  function insertQuestionRows() {
    const rows = generateQuestionSectionRowData()
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
    if (hasInitialized.current) return

    function setupInitialRowsAndInstances() {
      topUpObstacleBuffer(OBSTACLE_BUFFER_SECTIONS)

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
  }, [])

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

      if (currentRowData.type === 'intro' && currentRowData.isSectionEnd) {
        hasCompletedIntro.current = true
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

      if (hasCompletedIntro.current) {
        incrementDistanceRows(1)
      }
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
    positionQuestionElementsIfNeeded(rowIndex, rowZ)
    isRowRaised.current[rowIndex] = true

    const rowMetadata = activeRowsData.current[rowIndex]
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

  function updateTiles(zStep: number) {
    if (!instancedTilesRef.current?.rigidBodies) return

    const cycleDistance = ROWS_VISIBLE * TILE_SIZE
    currentScrollPosition.current += zStep

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

  function positionQuestionElementsIfNeeded(rowIndex: number, rowZ: number) {
    const row = activeRowsData.current[rowIndex]
    if (!row) return

    const textPosition = row.questionTextPosition
    if (textPosition && questionGroup.current) {
      questionGroup.current.position.set(
        textPosition[0],
        textPosition[1],
        rowZ + textPosition[2],
      )
    }

    const answerPositions = row.answerTilePositions
    if (!answerPositions) return

    for (
      let answerIndex = 0;
      answerIndex < answerPositions.length && answerIndex < answerRefs.length;
      answerIndex++
    ) {
      const position = answerPositions[answerIndex]
      if (!position) continue

      const answerRef = answerRefs[answerIndex]
      if (!answerRef.current) continue

      translation.current.x = position[0]
      translation.current.y = position[1]
      translation.current.z = rowZ + position[2]
      answerRef.current.setTranslation(translation.current, true)
    }
  }

  function moveQuestionElements(zStep: number) {
    if (!questionGroup.current) return

    const isQuestionBehindCamera = questionGroup.current.position.z > MAX_Z
    if (isQuestionBehindCamera) {
      questionGroup.current.position.z = HIDE_POSITION.QUESTION_Z
      questionGroup.current.position.y = HIDE_POSITION.QUESTION_Y
    } else {
      questionGroup.current.position.z += zStep
    }

    for (const answerRef of answerRefs) {
      if (!answerRef.current) continue

      const currentTranslation = answerRef.current.translation()
      if (currentTranslation.z > MAX_Z) {
        translation.current.x = currentTranslation.x
        translation.current.y = HIDE_POSITION.ANSWER_Y
        translation.current.z = HIDE_POSITION.ANSWER_Z
        answerRef.current.setTranslation(translation.current, false)
        continue
      }

      translation.current.x = currentTranslation.x
      translation.current.y = currentTranslation.y
      translation.current.z = currentTranslation.z + zStep
      answerRef.current.setTranslation(translation.current, true)
    }
  }

  useGameFrame((_, delta) => {
    if (!hasInitialized.current) return
    if (!instancedTilesRef.current?.shader) return
    if (stage === Stage.GAME_OVER) return

    instancedTilesRef.current.shader.uScrollZ = currentScrollPosition.current

    let computedSpeed = terrainSpeed.current

    if (stage === Stage.HOME) {
      computedSpeed = 0
    } else if (stage === Stage.QUESTION) {
      computedSpeed = computeTerrainSpeedForQuestionSection()
    }

    if (computedSpeed !== terrainSpeed.current) {
      setTerrainSpeed(computedSpeed)
    }

    const zStep = computedSpeed * TERRAIN_SPEED_UNITS * delta
    updateTiles(zStep)
    moveQuestionElements(zStep)
  })

  if (!tileInstances.length) return null

  return (
    <group>
      <InstancedTiles
        ref={instancedTilesRef}
        instances={tileInstances}
        instanceVisibility={instanceVisibility.current!}
        instanceSeed={instanceSeed.current!}
        instanceAnswerNumber={instanceAnswerNumber.current!}
      />
      <Text
        ref={questionGroup}
        text={currentQuestion?.text ?? ''}
        position={[0, INITIAL_QUESTION_POSITION.Y, INITIAL_QUESTION_POSITION.Z]}
        width={QUESTION_TEXT_WIDTH}
        height={QUESTION_TEXT_HEIGHT}
      />
      {answerRefs.map((answerRef, answerIndex) => (
        <QuestionAnswerTile
          key={`answer-tile-${answerIndex}`}
          ref={answerRef}
          index={answerIndex}
          position={[0, HIDE_POSITION.ANSWER_Y, HIDE_POSITION.ANSWER_Z]}
        />
      ))}
    </group>
  )
}

export default TopicRun
