/* eslint-disable simple-import-sort/imports */
'use client'

import { createRef, type FC, startTransition, useEffect, useRef, useState } from 'react'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
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

const Terrain: FC = () => {
  const stage = useGameStore((s) => s.stage)
  const isGameOver = stage === Stage.GAME_OVER
  const isQuestionStage = stage === Stage.QUESTION
  const isAwaitingQuestion = useGameStore((s) => s.isAwaitingQuestion)
  const currentQuestion = useGameStore((s) => s.currentQuestion)

  function onTerrainSpeedChange(normalized: number) {
    if (!tileShader.current) return
    // Interpolate entry window based on normalized speed.
    // 0 => question section fully raised; 1 => terrain entry offset used.
    const frontOffsetRows = QUESTION_SECTION_ROWS + (12 - QUESTION_SECTION_ROWS) * normalized

    const endZ = MAX_Z - frontOffsetRows * TILE_SIZE
    const startZ = endZ - ENTRY_RAISE_DURATION_ROWS * TILE_SIZE

    entryStartZRef.current = startZ
    entryEndZRef.current = endZ
    tileShader.current.uEntryStartZ = startZ
    tileShader.current.uEntryEndZ = endZ
  }

  // Normalized terrain speed [0,1]. Scale by TERRAIN_SPEED_UNITS when converting to world units.
  const { terrainSpeed } = useTerrainSpeed(onTerrainSpeedChange)
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
  const instanceVisibilityAttrRef = useRef<InstancedBufferAttribute>(null)

  const tileShader = useRef<typeof TileShaderMaterial & TileShaderUniforms>(null)
  const playerWorldPosRef = useRef<Vector3>(INITIAL_TILE_UNIFORMS.uPlayerWorldPos)
  const tmpTranslation = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })

  // Interpolated entry window refs (kept in sync with terrain speed changes)
  const entryStartZRef = useRef<number>(MAX_Z - QUESTION_SECTION_ROWS * TILE_SIZE)
  const entryEndZRef = useRef<number>(MAX_Z - QUESTION_SECTION_ROWS * TILE_SIZE)
  // Obstacle section precomputation buffer
  const obstacleSectionBuffer = useRef<RowData[][]>([])
  const obstacleTopUpScheduled = useRef(false)
  const OBSTACLE_BUFFER_SECTIONS = 10
  const OBSTACLE_TOPUP_THRESHOLD = 4

  // During question phase, extend front offset so all 16 rows are up.

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
    const rows = generateQuestionSectionRowData({
      isFirstQuestion,
    })
    rowsData.current = [...rowsData.current, ...rows]
    console.warn(`Inserted question section`, {
      rows,
      rowsData: rowsData.current,
    })
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

      // Seed with initial sections of row data
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

      for (let rowIndex = 0; rowIndex < ROWS_VISIBLE; rowIndex++) {
        const rowData = rowsData.current[rowIndex]
        // Track the row meta currently assigned to this visible slot
        activeRowsData.current[rowIndex] = rowData
        // Initialize deterministic scroll baselines
        baseZByRow.current[rowIndex] = -rowIndex * TILE_SIZE + zOffset
        wrapCountByRow.current[rowIndex] = 0

        for (let col = 0; col < COLUMNS; col++) {
          const x = colToX(col)
          const z = -rowIndex * TILE_SIZE + zOffset
          const y = rowData.heights[col]
          const bodyIndex = rowIndex * COLUMNS + col
          xByBodyIndex.current[bodyIndex] = x
          yByBodyIndex.current[bodyIndex] = y

          instanceVisibility.current[bodyIndex] = y === SAFE_HEIGHT ? 1 : 0
          instanceSeed.current[bodyIndex] = Math.random()

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

  // Deterministic row-content advance: apply N wraps worth of content updates for a row
  function applyRowWraps(rowIndex: number, wrapsToApply: number) {
    for (let n = 0; n < wrapsToApply; n++) {
      const currentRowData = activeRowsData.current[rowIndex]

      // Section boundary hooks for the row that's leaving the front
      if (currentRowData.type === 'obstacles' && currentRowData.isSectionEnd) {
        console.warn('terrain ended, switching to QUESTION stage')
        insertObstacleRows()
        goToStage(Stage.QUESTION)
      }
      if (currentRowData.type === 'question' && currentRowData.isSectionEnd) {
        console.warn('Inserting new question section')
        insertQuestionRows()
      }

      const newRowData = rowsData.current[nextRowIndex.current]
      activeRowsData.current[rowIndex] = newRowData
      nextRowIndex.current++

      // Update Y for all bodies in this row slot to match new content
      for (let col = 0; col < COLUMNS; col++) {
        const bodyIndex = rowIndex * COLUMNS + col
        yByBodyIndex.current[bodyIndex] = newRowData.heights[col]
        const y = newRowData.heights[col]
        instanceVisibility.current![bodyIndex] = y === SAFE_HEIGHT ? 1 : 0
      }

      instanceVisibilityAttrRef.current!.needsUpdate = true
    }

    // Reset raised state for this visible row slot when it wraps to new content
    if (wrapsToApply > 0) {
      rowRaisedRef.current[rowIndex] = false
    }
  }

  /**
   * Per-frame terrain advancement. Moves visible rows along +Z and recycles
   * them once they pass the camera threshold.
   */
  function updateTiles(zStep: number) {
    // Snapshot entry window for this frame
    const entryStartZ = entryStartZRef.current
    const entryEndZ = entryEndZRef.current
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
      console.warn('Placed question text (row trigger)')
    }
    const answerPositions = row.answerTilePositions
    if (!!answerPositions) {
      for (let i = 0; i < answerPositions.length; i++) {
        const t = answerPositions[i]
        const ref = answerRefs[i]
        if (!ref.current) continue
        ref.current.setTranslation({ x: t[0], y: t[1], z: rowZ + t[2] }, true)
      }
      console.warn('Placed answer tiles (row trigger)')
    }
  }

  /**
   * Keep question text and answers moving with the terrain.
   */
  function moveQuestionElements(zStep: number) {
    if (!questionGroupRef.current) return

    const hidePosition = { x: 0, y: -40, z: 40 }

    const isQuestionBehindCamera = questionGroupRef.current.position.z > MAX_Z
    if (isQuestionBehindCamera) {
      // Move out of view until next repositioning
      questionGroupRef.current.position.z = hidePosition.z
      questionGroupRef.current.position.y = hidePosition.y
    } else {
      questionGroupRef.current.position.z += zStep
    }

    // Answer tiles (rapier bodies)
    for (const ref of answerRefs) {
      if (!ref.current) continue
      const translation = ref.current.translation()
      if (translation.z > MAX_Z) {
        // Move out of view until next repositioning
        ref.current.setTranslation(
          { x: translation.x, y: hidePosition.y, z: hidePosition.z },
          false,
        )
        continue
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
  }

  // Per-frame update: compute Z step from speed and frame delta, then move both
  // terrain and question elements in lockstep.
  useFrame((_, delta) => {
    if (!isSetup.current) return
    if (!tileShader.current) return
    // Convert normalized speed to world units per second
    const zStep = terrainSpeed.current * TERRAIN_SPEED_UNITS * delta
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
              ref={instanceVisibilityAttrRef}
              attach="attributes-instanceVisibility"
              args={[instanceVisibility.current!, 1]}
            />
            <instancedBufferAttribute
              attach="attributes-instanceSeed"
              args={[instanceSeed.current!, 1]}
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
