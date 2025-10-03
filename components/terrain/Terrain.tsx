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
import { AnswerTile, QuestionText } from '@/components/Question'
import useThrottledLog from '@/hooks/useThrottledLog'
import { type AnswerUserData, type Question, type TopicUserData } from '@/model/schema'

// Grid configuration
const COLUMNS = 16
const ROWS = 24
const BOX_SIZE = 1
const BOX_SPACING = 1

// Camera/visibility thresholds
const CAMERA_RECYCLE_THRESHOLD_Z = BOX_SIZE * 5
const QUESTION_RESPAWN_NEAR_Z = CAMERA_RECYCLE_THRESHOLD_Z
const QUESTION_RESPAWN_FAR_Z = -900

// Section configuration
const QUESTION_SECTION_ROWS = 8
const OBSTACLE_SECTION_ROWS = 64

// Heights
const OPEN_HEIGHT = -BOX_SIZE / 2 // top of box at y=0
const BLOCKED_HEIGHT = -16 // sunken obstacles

const Terrain: FC = () => {
  const stage = useGameStore((state) => state.stage)
  const currentQuestionIndex = useGameStore((s) => s.currentQuestionIndex)
  const questions = useGameStore((s) => s.questions)

  const activeQuestion = useMemo<Question>(() => {
    return questions[currentQuestionIndex]
  }, [questions, currentQuestionIndex])

  const terrainSpeed = useGameStore((state) => state.terrainSpeed)

  const boxes = useRef<RapierRigidBody[]>(null)
  const [boxInstances, setBoxInstances] = useState<InstancedRigidBodyProps[]>([])
  const isSetup = useRef(false)

  // Row generation state
  // Tracks which logical section we're in and how many rows remain before
  // switching to the other section.
  type SectionType = 'question' | 'obstacles'
  const sectionRef = useRef<{
    type: SectionType
    rowsRemaining: number
    sectionRowIndex: number
  }>({ type: 'question', rowsRemaining: QUESTION_SECTION_ROWS, sectionRowIndex: 0 })

  // Obstacle generator buffer
  // Obstacle rows are generated in batches and consumed sequentially for
  // performance and determinism across columns.
  const obstacleBufferRef = useRef<{ rows: number[][]; index: number } | null>(null)

  // Pending row being assigned across columns during recycling
  // When a row is recycled, all columns should share the same freshly generated
  // data. We cache that row here until all columns of that row are reassigned.
  const pendingRowRef = useRef<null | {
    heights: number[]
    type: SectionType
    isSectionStart: boolean
    rowStartZ: number
    assignedCols: number
  }>(null)

  // Absolute row index counter (for debugging/future use)
  const rowIndexRef = useRef(0)

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

  const qaNextSpawnRef = useRef<null | {
    textPos: [number, number, number]
    tilePositions: [number, number, number][]
  }>(null)

  // ---------- Helpers ----------
  // TODO: Extract helpers (buffer management, section scheduler, placement) to
  // a small module (e.g. components/terrain/terrain-logic.ts) to keep this
  // component focused on rendering and movement.

  // Ensure a fresh buffer of obstacle rows exists; generate a batch when empty.
  function ensureObstacleBuffer(minRows: number) {
    if (
      !obstacleBufferRef.current ||
      obstacleBufferRef.current.index >= obstacleBufferRef.current.rows.length
    ) {
      const rowsToGen = Math.max(minRows, OBSTACLE_SECTION_ROWS * 2)
      obstacleBufferRef.current = {
        rows: generateObstacleHeights({
          rows: rowsToGen,
          cols: COLUMNS,
          minWidth: 4,
          maxWidth: 8,
          movePerRow: 1,
          freq: 0.12,
          notchChance: 0.1,
          openHeight: OPEN_HEIGHT,
          blockedHeight: BLOCKED_HEIGHT,
        }),
        index: 0,
      }
    }
  }

  /**
   * Produce the next row of heights and section metadata.
   *
   * - Alternates sections when `rowsRemaining` reaches zero.
   * - Question rows return all OPEN_HEIGHT to present a clean area.
   * - Obstacle rows are consumed from the pre-generated buffer.
   */
  function getNextRow(): { heights: number[]; type: SectionType; isSectionStart: boolean } {
    const s = sectionRef.current
    // Switch section if depleted
    if (s.rowsRemaining <= 0) {
      if (s.type === 'question') {
        sectionRef.current = {
          type: 'obstacles',
          rowsRemaining: OBSTACLE_SECTION_ROWS,
          sectionRowIndex: 0,
        }
      } else {
        sectionRef.current = {
          type: 'question',
          rowsRemaining: QUESTION_SECTION_ROWS,
          sectionRowIndex: 0,
        }
      }
    }
    const curr = sectionRef.current
    const isSectionStart = curr.sectionRowIndex === 0

    let heights: number[]
    if (curr.type === 'question') {
      heights = new Array(COLUMNS).fill(OPEN_HEIGHT)
    } else {
      ensureObstacleBuffer(OBSTACLE_SECTION_ROWS)
      const buf = obstacleBufferRef.current!
      heights = buf.rows[buf.index++]
      if (buf.index >= buf.rows.length) {
        // Force refresh next call
        obstacleBufferRef.current = null
      }
    }

    // Advance section counters
    curr.sectionRowIndex += 1
    curr.rowsRemaining -= 1

    return { heights, type: curr.type, isSectionStart }
  }

  // ---------- Setup initial rows ----------
  // Pre-generate the visible window of rows. If a question section starts
  // within the window, schedule question/answer placement immediately.
  useEffect(() => {
    if (isSetup.current) return

    const instances: InstancedRigidBodyProps[] = []
    const zOffset = BOX_SIZE * 5

    // Pre-generate visible window of rows
    for (let row = 0; row < ROWS; row++) {
      const rowData = getNextRow()

      // If this row starts a question section, schedule an immediate spawn
      if (rowData.isSectionStart && rowData.type === 'question') {
        const startZ = -row * BOX_SPACING + zOffset
        qaNextSpawnRef.current = computeQuestionPlacement(startZ)
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
      rowIndexRef.current += 1
    }

    setBoxInstances(instances)
    isSetup.current = true
  }, [])

  const throttledLog = useThrottledLog()
  // TODO: Remove or use throttledLog; currently unused in this component.

  // Recycle a row that has moved past the camera to the far end, assigning new
  // heights from the current section while keeping all columns in sync.
  function recycleBox({
    body,
    index,
    position,
  }: {
    body: RapierRigidBody
    index: number
    position: { x: number; y: number; z: number }
  }) {
    const col = index % COLUMNS
    const x = colToX(col)
    const newZ = position.z - ROWS * BOX_SPACING

    // Lazily create a pending row assignment so all columns share the same row data
    if (!pendingRowRef.current) {
      const rowData = getNextRow()
      pendingRowRef.current = {
        heights: rowData.heights,
        type: rowData.type,
        isSectionStart: rowData.isSectionStart,
        rowStartZ: newZ,
        assignedCols: 0,
      }
    }

    const pending = pendingRowRef.current!
    const y = pending.heights[col]
    body.setTranslation({ x, y, z: newZ }, true)
    pending.assignedCols += 1

    // If we've finished assigning this row to all columns, finalize
    if (pending.assignedCols >= COLUMNS) {
      // If this row starts a question section, schedule Q/A spawn aligned to it
      if (pending.isSectionStart && pending.type === 'question') {
        qaNextSpawnRef.current = computeQuestionPlacement(pending.rowStartZ)
      }
      rowIndexRef.current += 1
      pendingRowRef.current = null
    }
  }

  /**
   * Per-frame terrain advancement. Moves visible rows along +Z and recycles
   * them once they pass the camera threshold.
   */
  function updateBoxes(zStep: number) {
    if (!boxes.current) return
    const bodies = boxes.current
    // Iterate by rows: sample column 0 to decide recycle vs move for whole row
    for (let row = 0; row < ROWS; row++) {
      const base = row * COLUMNS
      const sample = bodies[base]
      if (!sample) continue
      const pos = sample.translation()
      const shouldRecycle = pos.z > CAMERA_RECYCLE_THRESHOLD_Z

      if (shouldRecycle) {
        for (let col = 0; col < COLUMNS; col++) {
          const index = base + col
          const body = bodies[index]
          if (!body) continue
          const p = body.translation()
          recycleBox({ body, index, position: p })
        }
      } else {
        for (let col = 0; col < COLUMNS; col++) {
          const body = bodies[base + col]
          if (!body) continue
          const p = body.translation()
          body.setTranslation({ x: p.x, y: p.y, z: p.z + zStep }, true)
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
      const { textPos, tilePositions } = qaNextSpawnRef.current
      // Place text
      questionGroupRef.current.position.set(textPos[0], textPos[1], textPos[2])
      // Place tiles
      tilePositions.forEach((pos, i) => {
        const ref = answerRefs[i].current
        if (!ref) return
        ref.setTranslation({ x: pos[0], y: pos[1], z: pos[2] }, true)
      })
      qaNextSpawnRef.current = null
    }
  }

  // Per-frame update: compute Z step from speed and frame delta, then move both
  // terrain and question elements in lockstep.
  useFrame(({}, delta) => {
    const zStep = terrainSpeed * delta
    updateBoxes(zStep)
    updateQuestionElements(zStep)
  })

  // Derive current userData types for tiles
  const tileUserData = useMemo<(AnswerUserData | TopicUserData)[]>(() => {
    if (currentQuestionIndex === 0) {
      // Topic selection uses TopicUserData for different intersection events.
      return activeQuestion.answers.slice(0, 4).map((a) => ({ type: 'topic', topic: a.text }))
    }
    return activeQuestion.answers.slice(0, 4).map((a) => ({ type: 'answer', answer: a }))
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
          <meshStandardMaterial
            color="grey"
            wireframe={false}
            transparent={true}
            opacity={0.5}
          />
        </instancedMesh>
      </InstancedRigidBodies>

      {/* Question overlay positioned over open section; single instance recycled */}

      <QuestionText
        ref={questionGroupRef}
        text={activeQuestion.text}
        position={[0, 0.01, -999]}
      />
      {answerRefs.map((ref, i) => (
        <AnswerTile
          key={`ans-${i}`}
          ref={ref}
          answer={activeQuestion.answers[i]}
          position={[0, -100, -100]} // off-screen until placed
          userData={tileUserData[i]}
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
function computeQuestionPlacement(startZ: number) {
  // Place within the 12 open rows that start at startZ and extend toward negative Z.
  // Put question text slightly behind the leading edge so it's over boxes.
  const textRowOffset = -4 // 4 rows behind the front row
  const answersRowOffsets = [-8, -8, -10, -10]
  const answerCols = [3, 12, 6, 9] // spread across grid

  const textPos: [number, number, number] = [0, 0.01, startZ + textRowOffset * BOX_SPACING]
  const tilePositions: [number, number, number][] = answersRowOffsets.map((off, i) => [
    colToX(answerCols[i]),
    0.001,
    startZ + off * BOX_SPACING,
  ])
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
