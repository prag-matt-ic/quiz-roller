'use client'

/**
 * Terrain system overview
 *
 * - Instanced grid: A fixed window of (ROWS x COLUMNS) boxes scrolls along +Z.
 *   Whole rows are recycled from in front of the camera to the far end and
 *   assigned new heights. Content alternates between "question" and "obstacles"
 *   sections.
 *
 * - Pooled Q/A elements: A single QuestionText group and up to four AnswerTile
 *   bodies are reused. They move every frame with the terrain and are only
 *   repositioned when a new question section is due.
 *
 * - Spawn scheduling (current behavior):
 *   1) When a row slot is assigned the start of a "question" section (during
 *      initial window build or via recycling), we queue the next spawn by
 *      storing that row slot’s base index and the intended tile count
 *      (first question = 4 tiles, otherwise 2).
 *   2) While a spawn is queued, the existing question/answers keep moving with
 *      the terrain.
 *   3) Once the current question elements leave the play area (beyond near/far
 *      Z thresholds), we read the exact Z from the stored row slot’s physics
 *      body and snap the pooled Q/A to their target positions inside the open
 *      rows. This guarantees exact grid alignment regardless of frame delta or
 *      time scaling.
 *   4) On initial mount, if the initial window already includes a question
 *      section start, we perform the first placement immediately after the
 *      instanced bodies mount for frame‑0 correctness.
 *
 * - Stage handoff: When the last "obstacles" row recycles, we switch to
 *   Stage.QUESTION to slow the terrain as the open question rows reach the player.
 */

import { useFrame } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  InstancedRigidBodyProps,
  RapierRigidBody,
} from '@react-three/rapier'
import { createRef, type FC, useEffect, useMemo, useRef, useState } from 'react'
import { Group } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'
import { AnswerTile, QuestionText } from '@/components/Question'
import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'
import useThrottledLog from '@/hooks/useThrottledLog'
import { type AnswerUserData, type Question, type TopicUserData } from '@/model/schema'

import {
  ANSWER_ROW_GAP_ROWS,
  ANSWER_TILE_COLS,
  ANSWER_TILE_HEIGHT,
  ANSWER_TILE_ROWS,
  ANSWER_TILE_SIDE_MARGIN_COLS,
  ANSWER_TILE_WIDTH,
  BOX_SIZE,
  BOX_SPACING,
  COLUMNS,
  generateObstacleHeights,
  ROWS_VISIBLE,
} from './terrainBuilder'

// Question text footprint (distinct from answer tile sizing)
const QUESTION_TEXT_COLS = 8
const QUESTION_TEXT_ROWS = 4
const QUESTION_TEXT_MAX_WIDTH = QUESTION_TEXT_COLS * BOX_SIZE
// Approximate font size to visually fill ~4 grid rows while allowing wrapping
const QUESTION_TEXT_FONT_SIZE = 0.38

// Camera/visibility thresholds
const CAMERA_RECYCLE_THRESHOLD_Z = BOX_SIZE * 6
// Section configuration
const QUESTION_SECTION_ROWS = 12
const OBSTACLE_SECTION_ROWS = 64

// Heights
const OPEN_HEIGHT = -BOX_SIZE / 2 // top of box at y=0
const BLOCKED_HEIGHT = -40 // sunken obstacles

// Placement tuning within the 12-row question section
// Lower row indices place elements closer to the section start (nearer to player)
const QUESTION_TEXT_ROW_OFFSET = 4 // was 6
const ANSWER_4_TILE_TOP_ROW = 5 // was 7; bottom will be top + 4 (=9)
const ANSWER_2_TILE_CENTER_ROW = 8 // was 10

type SectionType = 'question' | 'obstacles'

type RowData = {
  heights: number[]
  type: SectionType
  isSectionStart: boolean
  isSectionEnd: boolean
}

const Terrain: FC = () => {
  const stage = useGameStore((state) => state.stage)
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex)
  const questions = useGameStore((s) => s.questions)

  const activeQuestion = useMemo<Question>(() => {
    return questions[currentQuestionIndex]
  }, [questions, currentQuestionIndex])

  const { terrainSpeed } = useTerrainSpeed()
  const goToStage = useGameStore((s) => s.goToStage)

  const boxRigidBodies = useRef<RapierRigidBody[]>(null)
  const [boxInstances, setBoxInstances] = useState<InstancedRigidBodyProps[]>([])
  const isSetup = useRef(false)

  // Precomputed row sequence
  const rowsData = useRef<RowData[]>([])
  // Next rowData index to consume when recycling a row
  const nextRowIndex = useRef(0)
  // Tracks which RowData is currently assigned to each visible row slot (0..ROWS-1)
  const activeRowsData = useRef<RowData[]>([])

  // Question/answers instance refs and spawn scheduling
  // A single question group + four answer tiles are reused and moved along the
  // Z axis with the terrain. At the start of a question section, they're
  // repositioned to the new open rows.
  const questionGroupRef = useRef<Group>(null)
  const answerRefs = useRef([
    createRef<RapierRigidBody>(),
    createRef<RapierRigidBody>(),
    createRef<RapierRigidBody>(),
    createRef<RapierRigidBody>(),
  ]).current

  // Build a contiguous block of question rows
  function insertQuestionRows(isFirstQuestion = false) {
    const blocks: RowData[] = Array.from({ length: QUESTION_SECTION_ROWS }, (_, i) => ({
      heights: new Array(COLUMNS).fill(OPEN_HEIGHT),
      type: 'question',
      isSectionStart: i === 0,
      isSectionEnd: i === QUESTION_SECTION_ROWS - 1,
    }))
    rowsData.current = [...rowsData.current, ...blocks]
  }

  // Build a contiguous block of obstacle rows with a guaranteed corridor
  function insertObstacleRows() {
    const heights = generateObstacleHeights({
      rows: OBSTACLE_SECTION_ROWS,
      minWidth: 4,
      maxWidth: 8,
      movePerRow: 1,
      freq: 0.12,
      notchChance: 0.1,
      openHeight: OPEN_HEIGHT,
      blockedHeight: BLOCKED_HEIGHT,
    })
    const blocks: RowData[] = heights.map((h, i) => ({
      heights: h,
      type: 'obstacles',
      isSectionStart: i === 0,
      isSectionEnd: i === OBSTACLE_SECTION_ROWS - 1,
    }))
    rowsData.current = [...rowsData.current, ...blocks]
  }

  // No incremental generator; rows are precomputed into rowsDataRef.

  // ---------- Setup initial rows ----------
  // Pre-generate the visible window of rows. If a question section starts
  // within the window, schedule question/answer placement immediately.
  useEffect(() => {
    if (isSetup.current) return

    const instances: InstancedRigidBodyProps[] = []
    const zOffset = BOX_SIZE * 5

    // Seed with one block of questions and one of obstacles
    insertQuestionRows(true)
    insertObstacleRows()

    // Pre-generate visible window of rows
    for (let rowIndex = 0; rowIndex < ROWS_VISIBLE; rowIndex++) {
      const rowData = rowsData.current[rowIndex]
      // Track the row meta currently assigned to this visible slot
      activeRowsData.current[rowIndex] = rowData

      for (let col = 0; col < COLUMNS; col++) {
        const x = colToX(col)
        const z = -rowIndex * BOX_SPACING + zOffset
        const y = rowData.heights[col]
        instances.push({
          key: `terrain-${rowIndex}-${col}`,
          position: [x, y, z],
          userData: { type: 'terrain', rowIndex: rowIndex, colIndex: col },
        })
      }
    }

    setBoxInstances(instances)
    isSetup.current = true
    nextRowIndex.current = ROWS_VISIBLE
  }, [])

  // Positions the question text and answer tiles over the question section rows.
  function respawnQuestionElements(startRowZ: number, answerCount = 2) {
    if (!questionGroupRef.current || !boxRigidBodies.current) return
    const { textPos, tilePositions } = computeQuestionPlacement(startRowZ, answerCount)

    console.warn(`Respawning question elements at z=${startRowZ} for ${answerCount} tiles`, {
      textPos,
      tilePositions,
    })

    // Place text
    questionGroupRef.current.position.set(textPos[0], textPos[1], textPos[2])
    // Place tiles
    answerRefs.forEach((ref, i) => {
      if (!ref.current) return
      ref.current.setTranslation(
        { x: tilePositions[i][0], y: tilePositions[i][1], z: tilePositions[i][2] },
        true,
      )
    })
  }

  useEffect(() => {
    if (!questionGroupRef.current) return
    if (!boxInstances.length) return
    if (!boxRigidBodies.current) return

    function placeInitialQuestion() {
      const firstBoxRigidBody = boxRigidBodies.current![0]
      // First box is the initial question section, so position over it
      const startRowZ = firstBoxRigidBody.translation().z
      respawnQuestionElements(startRowZ, 4)
    }

    placeInitialQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerRefs, boxInstances.length, boxRigidBodies.current])

  // Recycle an entire row in one pass using precomputed row data.
  function recycleRow({ rowIndex, samplePos }: { rowIndex: number; samplePos: any }) {
    const newZ = samplePos.z - ROWS_VISIBLE * BOX_SPACING
    const newRowData = rowsData.current[nextRowIndex.current]

    // If the row being recycled was the last obstacle row, the question has just
    // reached the player. Trigger QUESTION stage to slow the terrain now.
    const currentRowData = activeRowsData.current[rowIndex]

    console.warn(`Recycling row ${rowIndex}`, {
      currentRowData,
      newRowData,
      nextRowIndex: nextRowIndex.current,
    })

    // TODO: Review this - it should go to stage when the row being recycled is the last obstacle row,
    if (currentRowData.type === 'obstacles' && currentRowData.isSectionEnd) {
      console.warn('terrain ended, switching to QUESTION stage')
      goToStage(Stage.QUESTION)
    }

    for (let col = 0; col < COLUMNS; col++) {
      const firstBodyIndex = rowIndex * COLUMNS
      const body = boxRigidBodies.current![firstBodyIndex + col]
      if (!body) continue
      body.userData = {}
      const x = colToX(col)
      const y = newRowData.heights[col]
      body.setTranslation({ x, y, z: newZ }, true)
    }

    // Finalize row assignment once for the row.
    // Update the assigned meta for this slot to the newly applied row.
    activeRowsData.current[rowIndex] = newRowData
    nextRowIndex.current++

    // If the new row is the end of a section, insert the next block of rows.
    if (newRowData.type === 'obstacles' && newRowData.isSectionEnd) {
      console.warn('Inserting new obstacle section')
      insertObstacleRows()
      return
    }

    if (newRowData.type === 'question' && newRowData.isSectionEnd) {
      console.warn('Inserting new question section')
      insertQuestionRows()
      return
    }

    // If this new row starts a question section, schedule a spawn of the Q/A
    if (newRowData.type === 'question' && newRowData.isSectionStart) {
      console.warn('Scheduling question elements respawn')
      respawnQuestionElements(newZ, 2)
      return
    }
  }

  /**
   * Per-frame terrain advancement. Moves visible rows along +Z and recycles
   * them once they pass the camera threshold.
   */
  // This is working well - do not edit without explicit instruction.
  function updateBoxes(zStep: number) {
    if (!boxRigidBodies.current) return
    // Iterate by rows: sample column 0 to decide recycle vs move for whole row
    for (let rowIndex = 0; rowIndex < ROWS_VISIBLE; rowIndex++) {
      const firstBodyIndex = rowIndex * COLUMNS
      const rigidBody = boxRigidBodies.current[firstBodyIndex]
      if (!rigidBody) continue
      const samplePos = rigidBody.translation()
      const shouldRecycleRow = samplePos.z > CAMERA_RECYCLE_THRESHOLD_Z

      if (shouldRecycleRow) {
        recycleRow({ rowIndex, samplePos })
      } else {
        // Move all column boxes in this row forward
        const newZ = samplePos.z + zStep
        for (let col = 0; col < COLUMNS; col++) {
          const body = boxRigidBodies.current[firstBodyIndex + col]
          if (!body) continue
          const p = body.translation()
          body.setTranslation({ x: p.x, y: p.y, z: newZ }, true)
        }
      }
    }
  }

  /**
   * Keep question text and answers moving with the terrain. When the text
   * exits the play area and a spawn is queued, reposition both over the next
   * question section.
   */
  function moveQuestionElements(zStep: number) {
    // Moves question and answers in the same direction & speed as terrain
    let shouldStopMovement = false

    // Answer tiles (rapier bodies)
    for (const ref of answerRefs) {
      if (!ref.current) continue
      const translation = ref.current.translation()

      if (translation.z > CAMERA_RECYCLE_THRESHOLD_Z) {
        shouldStopMovement = true
        break
      }
      ref.current.setTranslation(
        {
          x: translation.x,
          y: translation.y,
          z: translation.z + zStep,
        },
        true,
      )
    }

    if (shouldStopMovement) return
    questionGroupRef.current!.position.z += zStep
  }

  // Per-frame update: compute Z step from speed and frame delta, then move both
  // terrain and question elements in lockstep.
  useFrame(({}, delta) => {
    const zStep = terrainSpeed.current * delta
    updateBoxes(zStep)
    moveQuestionElements(zStep)
  })

  // Derive current userData types for tiles
  const tileUserData = useMemo<(AnswerUserData | TopicUserData)[]>(() => {
    // Topic selection uses TopicUserData for different intersection events.
    if (currentQuestionIndex === 0)
      return activeQuestion.answers.map((a) => ({ type: 'topic', topic: a.text }))

    return activeQuestion.answers.map((a) => ({
      type: 'answer',
      answer: a,
      questionIndex: currentQuestionIndex,
    }))
  }, [activeQuestion, currentQuestionIndex])

  if (!boxInstances.length) return null

  return (
    <group>
      <InstancedRigidBodies
        ref={boxRigidBodies}
        instances={boxInstances}
        type="fixed"
        canSleep={false}
        sensor={false}
        colliders="cuboid"
        friction={0.0}>
        <instancedMesh
          args={[undefined, undefined, boxInstances.length]}
          count={boxInstances.length}>
          <boxGeometry args={[BOX_SIZE, BOX_SIZE, BOX_SIZE]} />
          <meshStandardMaterial color="grey" />
        </instancedMesh>
      </InstancedRigidBodies>

      {/* Question overlay positioned over open section; single instance recycled */}
      <QuestionText
        ref={questionGroupRef}
        text={activeQuestion.text}
        maxWidth={QUESTION_TEXT_MAX_WIDTH}
        fontSize={QUESTION_TEXT_FONT_SIZE}
        position={[0, 0.01, -999]}
      />
      {/* Do not conditionally mount these tiles */}
      {answerRefs.map((ref, i) => (
        <AnswerTile
          key={`ans-${i}-${currentQuestionIndex}`}
          ref={ref}
          userData={tileUserData?.[i]}
          text={activeQuestion.answers[i]?.text}
          tileWidth={ANSWER_TILE_WIDTH}
          tileHeight={ANSWER_TILE_HEIGHT}
          position={[0, -100, -100]}
        />
      ))}
    </group>
  )
}

export default Terrain

const colToX = (col: number) => (col - COLUMNS / 2 + 0.5) * BOX_SPACING

/**
 * Decide where to place the question text and each answer tile relative to the
 * front row (startZ) of the current question section.
 * TODO: Move placement config (row offsets, columns) into named constants at
 * the top of the file or into a config module.
 */
function computeQuestionPlacement(startZ: number, tileCount: number) {
  // Placement within the 12 open rows starting at startZ.
  // Question text centered across 8 columns and ~4 rows.
  const textCenterCol = COLUMNS / 2 - 0.5 // center of grid
  const textCenterRowOffset = QUESTION_TEXT_ROW_OFFSET
  const textPos: [number, number, number] = [
    colToX(textCenterCol),
    0.01,
    startZ - textCenterRowOffset * BOX_SPACING,
  ]

  // Answers: fixed tile sizes, 2 columns of margin on each side and between tiles.
  const tilePositions: [number, number, number][] = []

  const leftEdgeCol = ANSWER_TILE_SIDE_MARGIN_COLS
  const rightEdgeCol = COLUMNS - ANSWER_TILE_SIDE_MARGIN_COLS - ANSWER_TILE_COLS
  const leftCenterCol = leftEdgeCol + (ANSWER_TILE_COLS - 1) / 2
  const rightCenterCol = rightEdgeCol + (ANSWER_TILE_COLS - 1) / 2

  if (tileCount === 4) {
    // Top row center and bottom row center with 2 rows gap between tiles (center delta = height + gap)
    const topCenterRow = ANSWER_4_TILE_TOP_ROW
    const bottomCenterRow = topCenterRow + ANSWER_TILE_ROWS + ANSWER_ROW_GAP_ROWS // 5 + 2 + 2 = 9
    tilePositions.push(
      [colToX(leftCenterCol), 0.001, startZ - topCenterRow * BOX_SPACING],
      [colToX(rightCenterCol), 0.001, startZ - topCenterRow * BOX_SPACING],
      [colToX(leftCenterCol), 0.001, startZ - bottomCenterRow * BOX_SPACING],
      [colToX(rightCenterCol), 0.001, startZ - bottomCenterRow * BOX_SPACING],
    )
  } else {
    const centerRow = ANSWER_2_TILE_CENTER_ROW
    tilePositions.push(
      [colToX(leftCenterCol), 0.001, startZ - centerRow * BOX_SPACING],
      [colToX(rightCenterCol), 0.001, startZ - centerRow * BOX_SPACING],
    )
  }

  return { textPos, tilePositions }
}
