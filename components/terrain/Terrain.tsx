/* eslint-disable simple-import-sort/imports */
'use client'

import { createRef, type FC, startTransition, useEffect, useRef, useState } from 'react'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  InstancedRigidBodyProps,
  RapierRigidBody,
} from '@react-three/rapier'
import { Group, InstancedBufferAttribute, Vector3 } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'
import { QuestionText } from '@/components/QuestionText'
import { AnswerTile } from '@/components/answerTile/AnswerTile'
import { TERRAIN_SPEED_UNITS } from '@/constants/game'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'
import { useGameFrame } from '@/hooks/useGameFrame'

import tileFadeFragment from './shaders/tile.frag'
import tileFadeVertex from './shaders/tile.vert'
import {
  COLUMNS,
  ENTRY_Y_OFFSET,
  ENTRY_RAISE_DURATION_ROWS,
  MAX_Z,
  OBSTACLE_SECTION_ROWS,
  QUESTION_SECTION_ROWS,
  ROWS_VISIBLE,
  SAFE_HEIGHT,
  TILE_SIZE,
  TILE_THICKNESS,
  colToX,
  generateObstacleHeights,
  RowData,
  generateQuestionSectionRowData,
  generateEntrySectionRowData,
} from './terrainBuilder'

// Shader material for fade-in (mirrors TunnelParticles pattern)
type TileShaderUniforms = {
  uEntryStartZ: number
  uEntryEndZ: number
  uPlayerWorldPos: Vector3
}
const INITIAL_TILE_UNIFORMS: TileShaderUniforms = {
  uEntryStartZ: -9999,
  uEntryEndZ: -9999,
  uPlayerWorldPos: new Vector3(0, 0, 0),
}
const CustomTileShaderMaterial = shaderMaterial(
  INITIAL_TILE_UNIFORMS,
  tileFadeVertex,
  tileFadeFragment,
)
const TileShaderMaterial = extend(CustomTileShaderMaterial)

// Reused constants/objects to avoid per-frame allocations
const HIDE_POSITION = { x: 0, y: -40, z: 40 }

const Terrain: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const isQuestionStage = stage === Stage.QUESTION
  const currentQuestion = useGameStore((s) => s.currentQuestion)
  const setTerrainSpeed = useGameStore((s) => s.setTerrainSpeed)

  // Fixed entry window values for row raising animation
  // When speed=0 (question stage), all question section rows should be fully raised
  const ENTRY_END_Z = MAX_Z - QUESTION_SECTION_ROWS * TILE_SIZE
  const ENTRY_START_Z = ENTRY_END_Z - ENTRY_RAISE_DURATION_ROWS * TILE_SIZE

  // Normalized terrain speed [0,1]. Scale by TERRAIN_SPEED_UNITS when converting to world units.
  const { terrainSpeed } = useTerrainSpeed()
  const goToStage = useGameStore((s) => s.goToStage)
  const tileRigidBodies = useRef<RapierRigidBody[]>(null)
  const [tileInstances, setTileInstances] = useState<InstancedRigidBodyProps[]>([])
  const isSetup = useRef(false)
  // Deterministic scrolling state
  const scrollZ = useRef(0)
  const baseZByRow = useRef<number[]>([])
  const wrapCountByRow = useRef<number[]>([])
  const xByBodyIndex = useRef<number[]>([])
  const yByBodyIndex = useRef<number[]>([])
  // Per-instance GPU attributes
  const instanceSeed = useRef<Float32Array | null>(null)
  // Single visibility channel in [0,1] replacing open mask + baseY attribute
  const instanceVisibility = useRef<Float32Array | null>(null)
  const instanceVisibilityBufferAttribute = useRef<InstancedBufferAttribute>(null)
  // Answer number per instance (0=not under answer, 1=answer 1, 2=answer 2, etc.)
  const instanceAnswerNumber = useRef<Float32Array | null>(null)
  const instanceAnswerNumberBufferAttribute = useRef<InstancedBufferAttribute>(null)

  const tileShader = useRef<typeof TileShaderMaterial & TileShaderUniforms>(null)
  const playerWorldPosRef = useRef<Vector3>(INITIAL_TILE_UNIFORMS.uPlayerWorldPos)
  const tmpTranslation = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
  const speedLogRef = useRef<{ lastT: number; lastSpeed: number; lastProgress: number } | null>(
    null,
  )

  // Deceleration easing configuration
  // We apply a steep ease-out to the terrain speed as the question section raises:
  //   speed = 1 - pow(progress, DECEL_EASE_POWER)
  // where progress is normalized [0..1] from the first question row reaching fully-raised
  // to the last row reaching fully-raised. Higher power -> slower early change and
  // a sharper drop near the end. 5 gives a noticeable but smooth slow-down that still
  // preserves momentum across most of the section.
  // Tune guide:
  //   3 = gentle ease-out
  //   4 = steep (previous default)
  //   5 = steeper (current)
  //   6+ = very steep (almost full speed until the final rows)
  const DECEL_EASE_POWER = 6
  // Start deceleration after an initial buffer so that the section has visually
  // "entered" before slowing begins. This offsets the start by N rows worth of scroll.
  // Keep this < QUESTION_SECTION_ROWS - 1. Typical values: 4..8
  const DECEL_START_OFFSET_ROWS = 6

  // Obstacle section precomputation buffer
  const obstacleSectionBuffer = useRef<RowData[][]>([])
  const obstacleTopUpScheduled = useRef(false)
  const OBSTACLE_BUFFER_SECTIONS = 10
  // During question phase, extend front offset so all 16 rows are up.

  // Precomputed row sequence
  const rowsData = useRef<RowData[]>([])
  // Next rowData index to consume when recycling a row
  const nextRowIndex = useRef(0)
  // Tracks which RowData is currently assigned to each visible row slot (0..ROWS-1)
  const activeRowsData = useRef<RowData[]>([])
  // Distance tracking: start counting only after entry section has fully recycled
  const hasFinishedEntryRef = useRef(false)
  const incrementDistanceRows = useGameStore((s) => s.incrementDistanceRows)

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

  // Question section speed deceleration state (scrollZ thresholds)
  // Start/end are expressed in scrollZ units so comparisons are consistent.
  const questionSectionStartZ = useRef<number | null>(null)
  const questionSectionEndZ = useRef<number | null>(null)
  const initialSpeedAtSectionStart = useRef<number>(1)

  // Build a contiguous block of question rows
  function insertQuestionRows(isFirstQuestion = false) {
    const rows = generateQuestionSectionRowData({
      isFirstQuestion,
    })
    rowsData.current = [...rowsData.current, ...rows]
  }

  // Build the initial entry corridor rows (pure)
  function insertEntryRows() {
    const rows = generateEntrySectionRowData()
    rowsData.current = [...rowsData.current, ...rows]
  }

  // Build a contiguous block of obstacle rows with a guaranteed corridor (pure)
  function getObstacleSectionRows(): RowData[] {
    const heights = generateObstacleHeights({
      rows: OBSTACLE_SECTION_ROWS,
      // Provide explicit seed so consecutive sections differ deterministically
      seed: Math.floor(Math.random() * 1_000_000),
      minWidth: 4,
      maxWidth: 8,
      movePerRow: 1,
      freq: 0.12,
      notchChance: 0.1,
    })
    return heights.map((h, i) => ({
      heights: h,
      type: 'obstacles',
      isSectionStart: i === 0,
      isSectionEnd: i === OBSTACLE_SECTION_ROWS - 1,
    }))
  }

  function topUpObstacleBuffer(count: number) {
    for (let i = 0; i < count; i++) obstacleSectionBuffer.current.push(getObstacleSectionRows())
  }

  function scheduleObstacleTopUpIfNeeded() {
    if (obstacleTopUpScheduled.current) return
    if (obstacleSectionBuffer.current.length > OBSTACLE_BUFFER_SECTIONS) return
    obstacleTopUpScheduled.current = true
    // Defer heavy generation outside the frame loop
    startTransition(() => {
      const needed = OBSTACLE_BUFFER_SECTIONS - obstacleSectionBuffer.current.length
      if (needed > 0) topUpObstacleBuffer(needed)
      obstacleTopUpScheduled.current = false
    })
  }

  // Append a precomputed obstacle section to the rows stream
  function insertObstacleRows() {
    const blocks = obstacleSectionBuffer.current.shift() ?? getObstacleSectionRows()
    rowsData.current = [...rowsData.current, ...blocks]
    scheduleObstacleTopUpIfNeeded()
  }

  // No incremental generator; rows are precomputed into rowsDataRef.

  // Pre-generate the visible window of rows
  useEffect(() => {
    if (isSetup.current) return

    function setupInitialRowsAndInstances() {
      // Precompute obstacle sections up front
      topUpObstacleBuffer(OBSTACLE_BUFFER_SECTIONS)

      // Seed with initial sections of row data: entry -> first question -> obstacles -> ...
      insertEntryRows()
      insertQuestionRows(true)
      insertObstacleRows()
      insertQuestionRows()
      insertObstacleRows()
      insertQuestionRows()
      insertObstacleRows()

      const instances: InstancedRigidBodyProps[] = []
      const zOffset = TILE_SIZE * 5

      // Pre-generate visible window of rows
      const totalInstances = ROWS_VISIBLE * COLUMNS
      instanceVisibility.current = new Float32Array(totalInstances)
      instanceSeed.current = new Float32Array(totalInstances)
      instanceAnswerNumber.current = new Float32Array(totalInstances)

      for (let rowIndex = 0; rowIndex < ROWS_VISIBLE; rowIndex++) {
        const rowData = rowsData.current[rowIndex]
        // Track the row meta currently assigned to this visible slot
        activeRowsData.current[rowIndex] = rowData
        // Initialize deterministic scroll baselines
        baseZByRow.current[rowIndex] = -rowIndex * TILE_SIZE + zOffset
        wrapCountByRow.current[rowIndex] = 0

        // Do not set deceleration thresholds here; we set them when the
        // first question row becomes fully raised so speed starts at 1.

        for (let col = 0; col < COLUMNS; col++) {
          const x = colToX(col)
          const z = -rowIndex * TILE_SIZE + zOffset
          const y = rowData.heights[col]
          const bodyIndex = rowIndex * COLUMNS + col
          xByBodyIndex.current[bodyIndex] = x
          yByBodyIndex.current[bodyIndex] = y

          instanceVisibility.current[bodyIndex] = y === SAFE_HEIGHT ? 1 : 0
          instanceSeed.current[bodyIndex] = Math.random()
          instanceAnswerNumber.current[bodyIndex] = rowData.answerNumber?.[col] ?? 0

          instances.push({
            key: `terrain-${rowIndex}-${col}`,
            position: [x, y, z],
            userData: { type: 'terrain', rowIndex: rowIndex, colIndex: col },
          })
        }
      }

      setTileInstances(instances)
      isSetup.current = true
      nextRowIndex.current = ROWS_VISIBLE
    }

    setupInitialRowsAndInstances()
    // We intentionally run this once on mount to seed initial rows
    // insertObstacleRows/topUpObstacleBuffer are stable callees and don't need to be deps here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Split placement helpers: text and answer tiles
  // Track raised state per visible row slot for current content
  const rowRaisedRef = useRef<boolean[]>([])

  // Subscribe to player position and update the uniform vector in-place (no allocations per frame)
  usePlayerPosition((pos) => {
    // TODO: store a vector3 in the store and update that so it can be read directly?
    playerWorldPosRef.current.set(pos.x, pos.y, pos.z)
  })

  // Reset question section deceleration when transitioning to TERRAIN stage
  useEffect(() => {
    if (stage === Stage.TERRAIN) {
      resetQuestionSectionDeceleration()
    }
  }, [stage])

  // Deterministic row-content advance: apply N wraps worth of content updates for a row
  function applyRowWraps(rowIndex: number, wrapsToApply: number) {
    for (let n = 0; n < wrapsToApply; n++) {
      const currentRowData = activeRowsData.current[rowIndex]

      // Section boundary hooks for the row that's leaving the front
      if (currentRowData.type === 'obstacles' && currentRowData.isSectionEnd) {
        insertObstacleRows()
      }

      if (currentRowData.type === 'question' && currentRowData.isSectionEnd) {
        insertQuestionRows()
      }

      // Detect the final intro row recycling to begin distance counting thereafter
      if (currentRowData.type === 'entry' && currentRowData.isSectionEnd) {
        hasFinishedEntryRef.current = true
      }

      const newRowData = rowsData.current[nextRowIndex.current]
      activeRowsData.current[rowIndex] = newRowData
      nextRowIndex.current++

      // Do not set deceleration thresholds when content becomes active.
      // We start deceleration only when the first question row is fully raised.

      // Update Y for all bodies in this row slot to match new content
      for (let col = 0; col < COLUMNS; col++) {
        const bodyIndex = rowIndex * COLUMNS + col
        yByBodyIndex.current[bodyIndex] = newRowData.heights[col]
        const y = newRowData.heights[col]
        instanceVisibility.current![bodyIndex] = y === SAFE_HEIGHT ? 1 : 0
        instanceAnswerNumber.current![bodyIndex] = newRowData.answerNumber?.[col] ?? 0
      }

      instanceVisibilityBufferAttribute.current!.needsUpdate = true
      instanceAnswerNumberBufferAttribute.current!.needsUpdate = true

      // Increment distance after completing the wrap if counting is active.
      if (hasFinishedEntryRef.current) incrementDistanceRows(1)
    }

    // Reset raised state for this visible row slot when it wraps to new content
    if (wrapsToApply > 0) {
      rowRaisedRef.current[rowIndex] = false
    }
  }

  /**
   * Compute the terrain speed based on the current scroll position relative to
   * the active question section. Speed decelerates from initial speed to 0 as
   * the last row of the section becomes fully raised.
   */
  function computeTerrainSpeedForQuestionSection(): number {
    const startZ = questionSectionStartZ.current
    const targetScrollZ = questionSectionEndZ.current
    const currentZ = scrollZ.current

    // No active question section deceleration
    if (startZ === null || targetScrollZ === null) {
      return terrainSpeed.current
    }

    // Before section start: use current speed
    if (currentZ < startZ) {
      return terrainSpeed.current
    }

    // After target scroll: speed is 0
    if (currentZ >= targetScrollZ) {
      return 0
    }

    // During deceleration: steep ease-out from 1 -> 0 across the section.
    // Curve: speed = 1 - pow(progress, DECEL_EASE_POWER)
    const progress = (currentZ - startZ) / (targetScrollZ - startZ)
    const p = Math.max(0, Math.min(1, progress))
    // Keep most of the speed early; drop sharply near the end
    const eased = 1 - Math.pow(p, DECEL_EASE_POWER)
    return eased
  }

  /**
   * Reset question section deceleration state when leaving the question stage.
   */
  function resetQuestionSectionDeceleration() {
    questionSectionStartZ.current = null
    questionSectionEndZ.current = null
    initialSpeedAtSectionStart.current = 1
  }

  /**
   * Per-frame terrain advancement. Moves visible rows along +Z and recycles
   * them once they pass the camera threshold.
   */
  function updateTiles(zStep: number) {
    // Use fixed entry window for row raising animation
    const entryStartZ = ENTRY_START_Z
    const entryEndZ = ENTRY_END_Z
    if (!tileRigidBodies.current) return
    const cycle = ROWS_VISIBLE * TILE_SIZE

    // Advance global scroll
    scrollZ.current += zStep

    // For each visible row slot, compute wrapped Z and apply any content wraps deterministically
    // Thresholds are driven by normalized terrain speed via refs

    for (let rowIndex = 0; rowIndex < ROWS_VISIBLE; rowIndex++) {
      const firstBodyIndex = rowIndex * COLUMNS
      // Wrapped Z for this row slot
      let z = baseZByRow.current[rowIndex] + scrollZ.current
      let wraps = 0
      while (z >= MAX_Z) {
        z -= cycle
        wraps++
      }

      // If this row crossed the boundary, advance its assigned content rows accordingly
      const prevWraps = wrapCountByRow.current[rowIndex]
      if (wraps > prevWraps) {
        applyRowWraps(rowIndex, wraps - prevWraps)
        wrapCountByRow.current[rowIndex] = wraps
      }

      // Compute per-row Y offset for entry lift animation (ignored during game over)
      let yOffset = -ENTRY_Y_OFFSET

      if (z >= entryStartZ) {
        if (z >= entryEndZ) {
          yOffset = 0
        } else {
          const tLift = (z - entryStartZ) / (entryEndZ - entryStartZ)
          yOffset = -ENTRY_Y_OFFSET * (1 - tLift)
        }
      }

      // Move all column tiles in this row to the computed absolute position
      for (let col = 0; col < COLUMNS; col++) {
        const body = tileRigidBodies.current[firstBodyIndex + col]
        if (!body) continue
        const bodyIndex = firstBodyIndex + col
        const t = tmpTranslation.current
        t.x = xByBodyIndex.current[bodyIndex]
        const baseY = yByBodyIndex.current[bodyIndex]
        t.y = baseY === SAFE_HEIGHT ? baseY + yOffset : baseY
        t.z = z
        body.setTranslation(t, true)
      }

      // If this row has just become fully raised for its current content, place any bound elements
      const wasRaised = rowRaisedRef.current[rowIndex] === true
      const isRaised = z >= entryEndZ
      if (!wasRaised && isRaised) {
        positionQuestionElementsIfNeeded(rowIndex, z)
        rowRaisedRef.current[rowIndex] = true

        // When the first row of a question section becomes fully raised,
        // set deceleration thresholds in scrollZ units and switch to QUESTION stage.
        const rowMeta = activeRowsData.current[rowIndex]
        if (rowMeta?.type === 'question' && rowMeta.isSectionStart && !isQuestionStage) {
          // Use absolute scrollZ values so thresholds align across cycles.
          const nowScrollZ = scrollZ.current
          // End when the last row becomes fully raised relative to this moment
          const endScrollZ = nowScrollZ + (QUESTION_SECTION_ROWS - 1) * TILE_SIZE
          // Delay the deceleration start by a small number of rows so the
          // section is visually present before slowing begins.
          const delayedStart = nowScrollZ + DECEL_START_OFFSET_ROWS * TILE_SIZE
          // Ensure start < end
          questionSectionStartZ.current = Math.min(delayedStart, endScrollZ - 1e-4)
          questionSectionEndZ.current = endScrollZ
          initialSpeedAtSectionStart.current = terrainSpeed.current
          goToStage(Stage.QUESTION)
        }
      }
    }
  }

  // Place elements when a row containing their target positions becomes fully raised
  function positionQuestionElementsIfNeeded(rowIndex: number, rowZ: number) {
    const row = activeRowsData.current[rowIndex]
    if (!row) return
    const text = row.questionTextPosition
    if (!!text && questionGroupRef.current) {
      questionGroupRef.current.position.set(text[0], text[1], rowZ + text[2])
    }
    const answerPositions = row.answerTilePositions
    if (!!answerPositions) {
      // Place only the indices provided by this trigger row (ignore nulls)
      for (let i = 0; i < answerPositions.length && i < answerRefs.length; i++) {
        const t = answerPositions[i]
        if (!t) continue
        const ref = answerRefs[i]
        if (!ref.current) continue
        const tmp = tmpTranslation.current
        tmp.x = t[0]
        tmp.y = t[1]
        tmp.z = rowZ + t[2]
        ref.current.setTranslation(tmp, true)
      }
    }
  }

  /**
   * Keep question text and answers moving with the terrain.
   */
  function moveQuestionElements(zStep: number) {
    if (!questionGroupRef.current) return

    const isQuestionBehindCamera = questionGroupRef.current.position.z > MAX_Z
    if (isQuestionBehindCamera) {
      // Move out of view until next repositioning
      questionGroupRef.current.position.z = HIDE_POSITION.z
      questionGroupRef.current.position.y = HIDE_POSITION.y
    } else {
      questionGroupRef.current.position.z += zStep
    }

    // Answer tiles (rapier bodies)
    for (const ref of answerRefs) {
      if (!ref.current) continue
      const translation = ref.current.translation()
      if (translation.z > MAX_Z) {
        // Move out of view until next repositioning
        const tmp = tmpTranslation.current
        tmp.x = translation.x
        tmp.y = HIDE_POSITION.y
        tmp.z = HIDE_POSITION.z
        ref.current.setTranslation(tmp, false)
        continue
      }
      const tmp = tmpTranslation.current
      tmp.x = translation.x
      tmp.y = translation.y
      tmp.z = translation.z + zStep
      ref.current.setTranslation(tmp, true)
    }
  }

  // Per-frame update: compute Z step from speed and frame delta, then move both
  // terrain and question elements in lockstep.
  useGameFrame((_, delta) => {
    if (!isSetup.current) return
    if (!tileShader.current) return

    // Update shader uniforms with fixed entry window values
    tileShader.current.uEntryStartZ = ENTRY_START_Z
    tileShader.current.uEntryEndZ = ENTRY_END_Z

    // Compute terrain speed with question section deceleration if active
    const computedSpeed = isQuestionStage
      ? computeTerrainSpeedForQuestionSection()
      : terrainSpeed.current

    // Update store if speed has changed
    if (computedSpeed !== terrainSpeed.current) {
      setTerrainSpeed(computedSpeed)
    }

    // Convert normalized speed to world units per second
    const zStep = computedSpeed * TERRAIN_SPEED_UNITS * delta
    updateTiles(zStep)
    moveQuestionElements(zStep)
    tileShader.current.uPlayerWorldPos = playerWorldPosRef.current
  })

  if (!tileInstances.length) return null

  return (
    <group>
      <InstancedRigidBodies
        ref={tileRigidBodies}
        instances={tileInstances}
        type="fixed"
        canSleep={false}
        sensor={false}
        colliders="cuboid"
        friction={0.0}>
        <instancedMesh
          args={[undefined, undefined, tileInstances.length]}
          count={tileInstances.length}>
          <boxGeometry args={[TILE_SIZE, TILE_THICKNESS, TILE_SIZE, 1, 1, 1]}>
            <instancedBufferAttribute
              ref={instanceVisibilityBufferAttribute}
              attach="attributes-visibility"
              args={[instanceVisibility.current!, 1]}
            />
            <instancedBufferAttribute
              attach="attributes-seed"
              args={[instanceSeed.current!, 1]}
            />
            <instancedBufferAttribute
              ref={instanceAnswerNumberBufferAttribute}
              attach="attributes-answerNumber"
              args={[instanceAnswerNumber.current!, 1]}
            />
          </boxGeometry>
          <TileShaderMaterial
            ref={tileShader}
            key={(CustomTileShaderMaterial as unknown as { key: string }).key}
            transparent
            depthWrite
            uEntryStartZ={INITIAL_TILE_UNIFORMS.uEntryStartZ}
            uEntryEndZ={INITIAL_TILE_UNIFORMS.uEntryEndZ}
            uPlayerWorldPos={playerWorldPosRef.current}
          />
        </instancedMesh>
      </InstancedRigidBodies>

      {/* Question overlay positioned over open section; single instance recycled */}
      <QuestionText
        ref={questionGroupRef}
        text={currentQuestion.text}
        position={[0, 0.01, -999]}
      />
      {/* Do not conditionally mount these tiles */}
      {answerRefs.map((ref, i) => (
        <AnswerTile key={`answer-tile-${i}`} ref={ref} index={i} position={[0, -100, -100]} />
      ))}
    </group>
  )
}

export default Terrain
