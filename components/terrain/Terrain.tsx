/* eslint-disable simple-import-sort/imports */
'use client'

import { createRef, type FC, useEffect, useMemo, useRef, useState } from 'react'
import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame } from '@react-three/fiber'
import {
  InstancedRigidBodies,
  InstancedRigidBodyProps,
  RapierRigidBody,
} from '@react-three/rapier'
import { Group, InstancedBufferAttribute, InstancedMesh, Vector3 } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'
import { AnswerTile, QuestionText } from '@/components/Question'
import { TERRAIN_SPEED_UNITS } from '@/constants/game'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'
import { type Question } from '@/model/schema'

import tileFadeFragment from './shaders/tileFade.frag'
import tileFadeVertex from './shaders/tileFade.vert'
import {
  COLUMNS,
  MAX_Z,
  OBSTACLE_SECTION_ROWS,
  QUESTION_SECTION_ROWS,
  QUESTION_TEXT_FONT_SIZE,
  QUESTION_TEXT_MAX_WIDTH,
  ROWS_VISIBLE,
  TILE_SIZE,
  colToX,
  generateObstacleHeights,
  generateQuestionHeights,
  positionQuestionAndAnswerTiles,
} from './terrainBuilder'

// Heights
const OPEN_HEIGHT = -TILE_SIZE / 2 // top of tile at y=0
const BLOCKED_HEIGHT = -40 // sunken obstacles

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
const TileFadeShaderMaterial = extend(CustomTileShaderMaterial)

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

  function onTerrainSpeedChange(normalized: number) {
    // Interpolate entry window based on normalized speed.
    // 0 => question section fully raised; 1 => terrain entry offset used.
    const frontOffsetRows =
      QUESTION_SECTION_ROWS + (ENTRY_FRONT_OFFSET_ROWS - QUESTION_SECTION_ROWS) * normalized
    const endZ = MAX_Z - frontOffsetRows * TILE_SIZE
    const startZ = endZ - ENTRY_RAISE_DURATION_ROWS * TILE_SIZE
    entryStartZRef.current = startZ
    entryEndZRef.current = endZ
    if (tileShaderRef.current) {
      tileShaderRef.current.uEntryStartZ = startZ
      tileShaderRef.current.uEntryEndZ = endZ
    }
  }

  // Normalized terrain speed [0,1]. Scale by TERRAIN_SPEED_UNITS when converting to world units.
  const { terrainSpeed } = useTerrainSpeed(onTerrainSpeedChange)
  const goToStage = useGameStore((s) => s.goToStage)
  // Track game-over in a ref to avoid re-renders and allow fast checks in frame loop
  const isGameOverRef = useRef(false)

  const tileRigidBodies = useRef<RapierRigidBody[]>(null)
  const [tileInstances, setTileInstances] = useState<InstancedRigidBodyProps[]>([])
  const isSetup = useRef(false)
  // Deterministic scrolling state
  const scrollZ = useRef(0)
  const baseZByRow = useRef<number[]>([])
  const wrapCountByRow = useRef<number[]>([])
  const xByBodyIndex = useRef<number[]>([])
  const yByBodyIndex = useRef<number[]>([])
  // Per-instance GPU attributes: open mask + base Y (at assignment time)
  const instanceOpenMask = useRef<Float32Array | null>(null)
  const instanceBaseY = useRef<Float32Array | null>(null)
  const instanceOpenAttrRef = useRef<InstancedBufferAttribute>(null)
  const instanceBaseYAttrRef = useRef<InstancedBufferAttribute>(null)
  const instancedMeshRef = useRef<InstancedMesh>(null)

  const tileShaderRef = useRef<typeof TileFadeShaderMaterial & TileShaderUniforms>(null)
  const playerWorldPosRef = useRef<Vector3>(INITIAL_TILE_UNIFORMS.uPlayerWorldPos)
  const tmpTranslation = useRef<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 })
  // Entry lift animation config (rows -> world units via TILE_SIZE)
  const ENTRY_LIFT_UNITS = TILE_SIZE * 2 // set them down by 1 unit
  const ENTRY_FRONT_OFFSET_ROWS = 12 // finish lifting this many rows before MAX_Z (player) during terrain
  const ENTRY_RAISE_DURATION_ROWS = 4 // raise over this many rows of travel
  // Interpolated entry window refs (kept in sync with terrain speed changes)
  const entryStartZRef = useRef<number>(
    MAX_Z - QUESTION_SECTION_ROWS * TILE_SIZE - ENTRY_RAISE_DURATION_ROWS * TILE_SIZE,
  )
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
    const heights = generateQuestionHeights({
      isFirstQuestion,
      openHeight: OPEN_HEIGHT,
      blockedHeight: BLOCKED_HEIGHT,
    })
    const blocks: RowData[] = heights.map((row, i) => ({
      heights: row,
      type: 'question',
      isSectionStart: i === 0,
      isSectionEnd: i === QUESTION_SECTION_ROWS - 1,
    }))
    rowsData.current = [...rowsData.current, ...blocks]
    console.warn(`Inserted question section`, {
      blocks,
      rowsData: rowsData.current,
    })
  }

  // Build a contiguous block of obstacle rows with a guaranteed corridor (pure)
  function buildObstacleSection(): RowData[] {
    const heights = generateObstacleHeights({
      rows: OBSTACLE_SECTION_ROWS,
      // Provide explicit seed so consecutive sections differ deterministically
      seed: Math.floor(Math.random() * 1_000_000),
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
      isSectionEnd: i === OBSTACLE_SECTION_ROWS - 1,
    }))
  }

  function topUpObstacleBuffer(count: number) {
    for (let i = 0; i < count; i++) obstacleSectionBuffer.current.push(buildObstacleSection())
  }

  function scheduleObstacleTopUpIfNeeded() {
    // TODO: return out..
    // Use React start transition instead of setTimeout?
    if (
      obstacleSectionBuffer.current.length <= OBSTACLE_TOPUP_THRESHOLD &&
      !obstacleTopUpScheduled.current
    ) {
      obstacleTopUpScheduled.current = true
      // Defer heavy generation outside the frame loop
      setTimeout(() => {
        try {
          const needed = OBSTACLE_BUFFER_SECTIONS - obstacleSectionBuffer.current.length
          if (needed > 0) topUpObstacleBuffer(needed)
        } finally {
          obstacleTopUpScheduled.current = false
        }
      }, 0)
    }
  }

  // Append a precomputed obstacle section to the rows stream
  function insertObstacleRows() {
    const blocks = obstacleSectionBuffer.current.shift() ?? buildObstacleSection()
    rowsData.current = [...rowsData.current, ...blocks]
    console.warn(`Inserted obstacle section from buffer`, {
      bufferSize: obstacleSectionBuffer.current.length,
    })
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

      const instances: InstancedRigidBodyProps[] = []
      const zOffset = TILE_SIZE * 5

      // Pre-generate visible window of rows
      const totalInstances = ROWS_VISIBLE * COLUMNS
      instanceOpenMask.current = new Float32Array(totalInstances)
      instanceBaseY.current = new Float32Array(totalInstances)

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
          if (instanceOpenMask.current && instanceBaseY.current) {
            instanceOpenMask.current[bodyIndex] = y === OPEN_HEIGHT ? 1 : 0
            instanceBaseY.current[bodyIndex] = y
          }
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

  // This is called when the first row in the question section becomes visible.
  // Positioning the Q&A elements over the proceeding rows.
  function repositionQuestionElements(startRowZ: number, answerCount = 2) {
    if (!questionGroupRef.current || !tileRigidBodies.current) return
    const { textPos, tilePositions } = positionQuestionAndAnswerTiles(startRowZ, answerCount)

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
    // Keep a ref in sync with stage for use inside frame loop
    isGameOverRef.current = stage === Stage.GAME_OVER
  }, [stage])

  // Subscribe to player position and update the uniform vector in-place (no allocations per frame)
  usePlayerPosition((pos) => {
    playerWorldPosRef.current.set(pos.x, pos.y, pos.z)
  })

  useEffect(() => {
    if (!questionGroupRef.current) return
    if (!tileInstances.length) return
    if (!tileRigidBodies.current) return

    function placeInitialQuestion() {
      const firstTileRigidBody = tileRigidBodies.current![0]
      // First tile is the initial question section, so position over it
      const startRowZ = firstTileRigidBody.translation().z
      repositionQuestionElements(startRowZ, 4)
    }

    placeInitialQuestion()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answerRefs, tileInstances.length, tileRigidBodies.current])

  // Deterministic row-content advance: apply N wraps worth of content updates for a row
  function applyRowWraps(rowIndex: number, wrapsToApply: number, wrappedZ: number) {
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
        if (instanceOpenMask.current && instanceBaseY.current) {
          const y = newRowData.heights[col]
          instanceOpenMask.current[bodyIndex] = y === OPEN_HEIGHT ? 1 : 0
          instanceBaseY.current[bodyIndex] = y
        }
      }
      if (instanceOpenAttrRef.current) instanceOpenAttrRef.current.needsUpdate = true
      if (instanceBaseYAttrRef.current) instanceBaseYAttrRef.current.needsUpdate = true
    }

    // If, after applying wraps, the assigned row starts a question section, position Q/A elements
    const assigned = activeRowsData.current[rowIndex]
    if (wrapsToApply > 0 && assigned.type === 'question' && assigned.isSectionStart) {
      console.warn('Scheduling question elements respawn (deterministic)')
      repositionQuestionElements(wrappedZ, 2)
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
        applyRowWraps(rowIndex, wraps - prevWraps, z)
        wrapCountByRow.current[rowIndex] = wraps
      }

      // Compute per-row Y offset for entry lift animation (ignored during game over)
      let yOffset = -ENTRY_LIFT_UNITS
      if (!isGameOverRef.current) {
        if (z >= entryStartZ) {
          if (z >= entryEndZ) {
            yOffset = 0
          } else {
            const tLift = (z - entryStartZ) / (entryEndZ - entryStartZ)
            yOffset = -ENTRY_LIFT_UNITS * (1 - tLift)
          }
        }
      }

      // Move all column tiles in this row to the computed absolute position
      for (let col = 0; col < COLUMNS; col++) {
        const body = tileRigidBodies.current[firstBodyIndex + col]
        if (!body) continue
        const bodyIndex = firstBodyIndex + col
        const t = tmpTranslation.current
        t.x = xByBodyIndex.current[bodyIndex]
        if (isGameOverRef.current) {
          // Force closed height while game over is active
          t.y = BLOCKED_HEIGHT
        } else {
          const baseY = yByBodyIndex.current[bodyIndex]
          t.y = baseY === OPEN_HEIGHT ? baseY + yOffset : baseY
        }
        t.z = z
        body.setTranslation(t, true)
      }
    }
  }

  /**
   * Keep question text and answers moving with the terrain.
   */
  function moveQuestionElements(zStep: number) {
    if (!questionGroupRef.current) return

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
  }

  // Per-frame update: compute Z step from speed and frame delta, then move both
  // terrain and question elements in lockstep.
  useFrame((_, delta) => {
    if (!isSetup.current) return
    if (!tileShaderRef.current) return
    // Convert normalized speed to world units per second
    const zStep = terrainSpeed.current * TERRAIN_SPEED_UNITS * delta
    updateTiles(zStep)
    moveQuestionElements(zStep)
    tileShaderRef.current.uPlayerWorldPos = playerWorldPosRef.current
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
          ref={instancedMeshRef}
          args={[undefined, undefined, tileInstances.length]}
          count={tileInstances.length}>
          <boxGeometry args={[TILE_SIZE, 0.16, TILE_SIZE]}>
            <instancedBufferAttribute
              ref={instanceOpenAttrRef}
              attach="attributes-instanceOpen"
              args={[instanceOpenMask.current!, 1]}
            />
            <instancedBufferAttribute
              ref={instanceBaseYAttrRef}
              attach="attributes-instanceBaseY"
              args={[instanceBaseY.current!, 1]}
            />
          </boxGeometry>
          <TileFadeShaderMaterial
            ref={tileShaderRef}
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
        text={activeQuestion.text}
        maxWidth={QUESTION_TEXT_MAX_WIDTH}
        fontSize={QUESTION_TEXT_FONT_SIZE}
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
