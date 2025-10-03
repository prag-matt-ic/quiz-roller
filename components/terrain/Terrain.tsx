'use client'

/**
 * Terrain system overview
 *
 * The world scrolls forward along +Z using a fixed-size window of instanced
 * boxes (rows x columns). Rows are recycled from in front of the camera to the
 * far end, where they receive fresh heights. The content alternates between two
 * logical sections:
 *
 * - "question" section: multiple rows are completely open to host the
 *   question text and the four answer tiles.
 * - "obstacles" section: many rows are procedurally generated with a safe
 *   corridor that always remains traversable.
 *
 * Per-frame, both the terrain and the question elements move forward by the
 * same Z step computed from `terrainSpeed * delta`. When a recycled row marks
 * the start of a "question" section, the question/answers are repositioned to
 * align with those open rows.
 */

import { useFrame } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  InstancedRigidBodyProps,
  RapierRigidBody,
} from '@react-three/rapier'
import { createRef, type FC, useEffect, useMemo, useRef, useState } from 'react'
import { createNoise2D } from 'simplex-noise'
import { Group } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'
import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'
import { AnswerTile, QuestionText } from '@/components/Question'
import useThrottledLog from '@/hooks/useThrottledLog'
import { type AnswerUserData, type Question, type TopicUserData } from '@/model/schema'

// Grid configuration
const COLUMNS = 16
const ROWS = 40
const BOX_SIZE = 1
const BOX_SPACING = 1

// Answer tile fixed sizing (in world units, aligned to grid columns/rows)
const ANSWER_TILE_COLS = 5 // ensures 2 cols margin left/right and between tiles across 16 cols
const ANSWER_TILE_ROWS = 2
const ANSWER_TILE_SIDE_MARGIN_COLS = 2
const ANSWER_ROW_GAP_ROWS = 2 // vertical gap between answer rows when there are 4 tiles

const ANSWER_TILE_WIDTH = ANSWER_TILE_COLS * BOX_SIZE
const ANSWER_TILE_HEIGHT = ANSWER_TILE_ROWS * BOX_SIZE

// Question text footprint (distinct from answer tile sizing)
const QUESTION_TEXT_COLS = 8
const QUESTION_TEXT_ROWS = 4
const QUESTION_TEXT_MAX_WIDTH = QUESTION_TEXT_COLS * BOX_SIZE
// Approximate font size to visually fill ~4 grid rows while allowing wrapping
const QUESTION_TEXT_FONT_SIZE = 0.38

// Camera/visibility thresholds
const CAMERA_RECYCLE_THRESHOLD_Z = BOX_SIZE * 5
const QUESTION_RESPAWN_NEAR_Z = CAMERA_RECYCLE_THRESHOLD_Z
const QUESTION_RESPAWN_FAR_Z = -900

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

  const boxes = useRef<RapierRigidBody[]>(null)
  const [boxInstances, setBoxInstances] = useState<InstancedRigidBodyProps[]>([])
  const isSetup = useRef(false)

  // Precomputed row sequence
  const rowsDataRef = useRef<RowData[]>([])
  // Next rowData index to consume when recycling a row
  const rowIndexRef = useRef(0)
  // Tracks which RowData is currently assigned to each visible row slot (0..ROWS-1)
  const assignedRowsRef = useRef<RowData[]>([])

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

  // Queue for next question/answers spawn. We store the instanced row's base index
  // so we can compute the exact Z at spawn time (prevents drift between schedule
  // time and spawn time as terrain advances).
  const qaNextSpawnRef = useRef<{
    startRowBaseIndex: number
    tileCount: number
  } | null>(null)

  // ---------- Helpers ----------
  // TODO: Extract helpers (buffer management, section scheduler, placement) to
  // a small module (e.g. components/terrain/terrain-logic.ts) to keep this
  // component focused on rendering and movement.

  // Build a contiguous block of question rows
  function buildQuestionRows(count: number): RowData[] {
    return Array.from({ length: count }, (_, i) => ({
      heights: new Array(COLUMNS).fill(OPEN_HEIGHT),
      type: 'question',
      isSectionStart: i === 0,
      isSectionEnd: i === count - 1,
    }))
  }

  // Build a contiguous block of obstacle rows with a guaranteed corridor
  function buildObstacleRows(count: number): RowData[] {
    const heights = generateObstacleHeights({
      rows: count,
      cols: COLUMNS,
      minWidth: 4,
      maxWidth: 8,
      movePerRow: 1,
      freq: 0.12,
      notchChance: 0.1,
      openHeight: OPEN_HEIGHT,
      blockedHeight: BLOCKED_HEIGHT,
    })
    return heights.map((h, i) => ({
      heights: h,
      type: 'obstacles',
      isSectionStart: i === 0,
      isSectionEnd: i === count - 1,
    }))
  }

  // Append a new block of rows for a given section type
  function appendRowsForSection(type: SectionType) {
    const block: RowData[] =
      type === 'question'
        ? buildQuestionRows(QUESTION_SECTION_ROWS)
        : buildObstacleRows(OBSTACLE_SECTION_ROWS)
    rowsDataRef.current = [...rowsDataRef.current, ...block]
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
    appendRowsForSection('question')
    appendRowsForSection('obstacles')

    // Pre-generate visible window of rows
    for (let row = 0; row < ROWS; row++) {
      const rowData = rowsDataRef.current[row]
      // Track the row meta currently assigned to this visible slot
      assignedRowsRef.current[row] = rowData

      // If this row starts a question section, schedule an immediate spawn
      if (rowData.type === 'question' && rowData.isSectionStart) {
        const tileCount = currentQuestionIndex === 0 ? 4 : 2
        // Store which instanced row slot will represent this start row.
        qaNextSpawnRef.current = {
          startRowBaseIndex: row * COLUMNS,
          tileCount,
        }
      }

      for (let col = 0; col < COLUMNS; col++) {
        const x = colToX(col)
        const z = -row * BOX_SPACING + zOffset
        const y = rowData.heights[col]
        instances.push({
          key: `terrain-${row}-${col}`,
          position: [x, y, z],
          userData: { type: 'terrain', rowIndex: row, colIndex: col },
        })
      }
      // initial window only; consumption starts at ROWS
    }

    setBoxInstances(instances)
    isSetup.current = true
    rowIndexRef.current = ROWS
  }, [])

  // Ensure the very first question/topic spawn aligns exactly to grid rows
  // immediately after the physics instances are mounted, instead of waiting
  // for off-screen recycling thresholds.
  useEffect(() => {
    // Run after instanced bodies mount
    if (!boxes.current || !questionGroupRef.current) return
    if (!qaNextSpawnRef.current) return
    const { startRowBaseIndex, tileCount } = qaNextSpawnRef.current
    const startBody = boxes.current[startRowBaseIndex]
    if (!startBody) return
    const startRowZ = startBody.translation().z
    const { textPos, tilePositions } = computeQuestionPlacement(startRowZ, tileCount)
    // Place text and tiles now for frame-0 correctness
    questionGroupRef.current.position.set(textPos[0], textPos[1], textPos[2])
    tilePositions.forEach((pos, i) => {
      const ref = answerRefs[i].current
      if (!ref) return
      ref.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true)
    })
    qaNextSpawnRef.current = null
  }, [answerRefs, boxInstances.length])

  // Recycle an entire row in one pass using precomputed row data.
  function recycleRow({ base, samplePos }: { base: number; samplePos: any }) {
    const newZ = samplePos.z - ROWS * BOX_SPACING
    const nextRow = rowsDataRef.current[rowIndexRef.current]
    const rowIdx = Math.floor(base / COLUMNS)

    // If the row being recycled was the last obstacle row, the question has just
    // reached the player. Trigger QUESTION stage to slow the terrain now.
    const prevRow = assignedRowsRef.current[rowIdx]
    if (prevRow && prevRow.type === 'obstacles' && prevRow.isSectionEnd) {
      goToStage(Stage.QUESTION)
    }

    for (let col = 0; col < COLUMNS; col++) {
      const body = boxes.current![base + col]
      if (!body) continue
      body.userData = {}
      const x = colToX(col)
      const y = nextRow.heights[col]
      body.setTranslation({ x, y, z: newZ }, true)
    }

    // Finalize row assignment once for the row.
    // Update the assigned meta for this slot to the newly applied row.
    assignedRowsRef.current[rowIdx] = nextRow
    if (nextRow.isSectionStart && nextRow.type === 'question') {
      const tileCount = currentQuestionIndex === 0 ? 4 : 2
      // The recycled row's base index becomes the new start row slot.
      qaNextSpawnRef.current = { startRowBaseIndex: base, tileCount }
    }
    if (nextRow.isSectionEnd) {
      // Alternate sections: after finishing a block, append the opposite type.
      appendRowsForSection(nextRow.type === 'question' ? 'obstacles' : 'question')
    }
    rowIndexRef.current++
  }

  /**
   * Per-frame terrain advancement. Moves visible rows along +Z and recycles
   * them once they pass the camera threshold.
   */
  function updateBoxes(zStep: number) {
    if (!boxes.current) return
    // Iterate by rows: sample column 0 to decide recycle vs move for whole row
    for (let row = 0; row < ROWS; row++) {
      const base = row * COLUMNS
      const sample = boxes.current[base]
      if (!sample) continue
      const samplePos = sample.translation()
      const shouldRecycleRow = samplePos.z > CAMERA_RECYCLE_THRESHOLD_Z

      if (shouldRecycleRow) {
        recycleRow({ base, samplePos })
      } else {
        // Move forward
        const newZ = samplePos.z + zStep
        for (let col = 0; col < COLUMNS; col++) {
          const body = boxes.current[base + col]
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
  function updateQuestionElements(zStep: number) {
    // Move Question text and Answer tiles with terrain, and recycle when off screen
    if (!questionGroupRef.current) return
    // Move in the same direction/speed as terrain
    questionGroupRef.current.position.z += zStep

    // Answer tiles (rapier bodies)
    for (const ref of answerRefs) {
      if (!ref.current) continue
      const translation = ref.current.translation()
      ref.current.setTranslation(
        {
          x: translation.x,
          y: translation.y,
          z: translation.z + zStep,
        },
        true,
      )
    }

    // If question has moved past the camera, and we have a queued spawn, recycle now
    if (
      qaNextSpawnRef.current &&
      questionGroupRef.current &&
      (questionGroupRef.current.position.z > QUESTION_RESPAWN_NEAR_Z ||
        questionGroupRef.current.position.z < QUESTION_RESPAWN_FAR_Z)
    ) {
      // Compute exact current Z for the start row using the instanced row slot
      // we stored at schedule time. This ensures perfect alignment to cells.
      const { startRowBaseIndex, tileCount } = qaNextSpawnRef.current
      if (boxes.current && boxes.current[startRowBaseIndex]) {
        const startRowZ = boxes.current[startRowBaseIndex].translation().z
        const { textPos, tilePositions } = computeQuestionPlacement(startRowZ, tileCount)

        // Place text
        questionGroupRef.current.position.set(textPos[0], textPos[1], textPos[2])
        // Place tiles
        tilePositions.forEach((pos, i) => {
          const ref = answerRefs[i].current
          if (!ref) return
          ref.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true)
        })
      }
      qaNextSpawnRef.current = null
    }
  }

  // Per-frame update: compute Z step from speed and frame delta, then move both
  // terrain and question elements in lockstep.
  useFrame(({}, delta) => {
    const zStep = terrainSpeed.current * delta
    updateBoxes(zStep)
    updateQuestionElements(zStep)
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
        ref={boxes}
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
      {/* TODO: do not unmount these tiles. they should be recycled / hidden. */}
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

// ---------- Helper (place above Terrain component) ----------

type ObstacleParams = {
  rows: number // e.g. 256
  cols: number // e.g. 12
  seed?: number // deterministic if you want; defaults Math.random()
  minWidth: number // minimum open corridor width (>=1)
  maxWidth: number // starting width (e.g. 4)
  movePerRow: number // max lateral shift (cells) per row (reachability)
  freq: number // noise frequency (0.05..0.2)
  notchChance: number // 0..1 small chance to nibble corridor edge
  openHeight?: number // y for open cells (default -1000)
  blockedHeight?: number // y for obstacles (default 0)
}

function clamp(x: number, a: number, b: number) {
  return Math.max(a, Math.min(b, x))
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}
function stepToward(curr: number, target: number, maxStep: number) {
  if (target > curr) return Math.min(curr + maxStep, target)
  if (target < curr) return Math.max(curr - maxStep, target)
  return curr
}

/**
 * Generate a batch of obstacle rows that ALWAYS contains a continuous safe corridor.
 * Returns heights[row][col] where blocked -> blockedHeight, open -> openHeight.
 *
 * TODO: Move this generator into its own module (e.g. model/obstacles.ts) and
 * expose a pure function for testability.
 */
function generateObstacleHeights(params: ObstacleParams): number[][] {
  const {
    rows,
    cols,
    seed = Math.random() * 10_000,
    minWidth,
    maxWidth,
    movePerRow,
    freq,
    notchChance,
    openHeight = 0,
    blockedHeight = -1000,
  } = params

  const SAFE_START_ROWS = 10 // First 10 rows always fully unblocked

  // Use simplex 2D as 1D noise by fixing Y=seed
  const noise2D = createNoise2D()
  const noise1D = (i: number) => noise2D(i * freq, seed) // [-1, 1]

  const heights: number[][] = new Array(rows)
  const centerStart = Math.floor(cols / 2)
  let cPrev = centerStart

  // width "breathes" and gently shrinks across the batch
  const widthAt = (i: number) => {
    const t = i / rows
    const wiggle = noise1D(i * 0.25 + 100) * 0.5 + 0.5 // [0,1]
    const base = lerp(maxWidth, minWidth, t) // shrink over batch
    const knock = wiggle > 0.7 ? 1 : 0
    return clamp(Math.round(base - knock), minWidth, maxWidth)
  }

  for (let i = 0; i < rows; i++) {
    // First 10 rows: completely unblocked
    if (i < SAFE_START_ROWS) {
      heights[i] = new Array<number>(cols).fill(openHeight)
      continue
    }

    const rowHeights = new Array<number>(cols).fill(blockedHeight)

    // Soft target center from noise, then cap drift for reachability
    const n = noise1D(i) // [-1,1]
    const target = Math.round((n + 1) * 0.5 * (cols - 3)) + 1 // keep off hard edges
    const c = clamp(stepToward(cPrev, target, movePerRow), 0, cols - 1)
    const w = widthAt(i)

    // Corridor indices
    const halfL = Math.floor((w - 1) / 2)
    const halfR = Math.ceil((w - 1) / 2)
    const L = clamp(c - halfL, 0, cols - 1)
    const R = clamp(c + halfR, 0, cols - 1)

    // Open the corridor
    for (let col = L; col <= R; col++) rowHeights[col] = openHeight

    // Optional notch: nibble corridor edge but never seal it
    if (Math.random() < notchChance && w >= 2) {
      const sideLeft = Math.random() < 0.5
      const notchWidth = Math.min(2, w - 1) // preserve ≥1 open cell
      if (sideLeft) {
        for (let k = 0; k < notchWidth; k++) rowHeights[L + k] = blockedHeight
      } else {
        for (let k = 0; k < notchWidth; k++) rowHeights[R - k] = blockedHeight
      }
      // Ensure at least one cell open
      let anyOpen = false
      for (let col = L; col <= R; col++)
        if (rowHeights[col] === openHeight) {
          anyOpen = true
          break
        }
      if (!anyOpen) rowHeights[c] = openHeight // reopen center if we accidentally sealed it
    }

    heights[i] = rowHeights
    cPrev = c
  }

  return heights
}
