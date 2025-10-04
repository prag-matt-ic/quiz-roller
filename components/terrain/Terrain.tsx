'use client'

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
  ANSWER_TILE_HEIGHT,
  ANSWER_TILE_WIDTH,
  BOX_SIZE,
  BOX_SPACING,
  colToX,
  COLUMNS,
  computeQuestionPlacement,
  generateObstacleHeights,
  QUESTION_TEXT_MAX_WIDTH,
  ROWS_VISIBLE,
} from './terrainBuilder'

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

  // Pre-generate the visible window of rows
  useEffect(() => {
    if (isSetup.current) return

    function setupInitialRowsAndInstances() {
      // Seed with initial sections of row data
      insertQuestionRows(true)
      insertObstacleRows()

      const instances: InstancedRigidBodyProps[] = []
      const zOffset = BOX_SIZE * 5

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
    }

    setupInitialRowsAndInstances()
  }, [])

  // Positions the question text and answer tiles over the question section rows.
  function repositionQuestionElements(startRowZ: number, answerCount = 2) {
    if (!questionGroupRef.current || !boxRigidBodies.current) return
    const { textPos, tilePositions } = computeQuestionPlacement(startRowZ, answerCount)

    console.warn(
      `Repositioning question elements at z=${startRowZ} with ${answerCount} answer tiles`,
      {
        textPos,
        tilePositions,
      },
    )

    // Place text
    questionGroupRef.current.position.set(textPos[0], textPos[1], textPos[2])
    // Place tiles
    answerRefs.forEach((ref, i) => {
      if (tilePositions[i] === undefined) return // When there are only 2 answers not all refs are used
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
      repositionQuestionElements(startRowZ, 4)
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
      repositionQuestionElements(newZ, 2)
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
   * Keep question text and answers moving with the terrain.
   */
  function moveQuestionElements(zStep: number) {
    if (!questionGroupRef.current) return
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
    questionGroupRef.current.position.z += zStep
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
