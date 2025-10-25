import { type InstancedRigidBodyProps } from '@react-three/rapier'

import { ANSWER_TILE_COLS, ANSWER_TILE_ROWS } from '@/utils/terrainBuilder'
import { SAFE_HEIGHT, TILE_SIZE, UNSAFE_HEIGHT } from '@/utils/tiles'

export const HOME_COLUMNS = 16
export const HOME_ROWS = 24

export type HomeBuildResult = {
  instances: InstancedRigidBodyProps[]
  instanceVisibility: Float32Array
  instanceSeed: Float32Array
  instanceAnswerNumber: Float32Array
}

export type HomeRowData = {
  heights: number[]
  answerNumber: number[]
}

const HOME_LEFT_TILE_START_COL = 1
const HOME_RIGHT_TILE_START_COL = 9

const HOME_ANSWER_TILE_START_ROW = 2
const HOME_ANSWER_TILE_END_ROW = HOME_ANSWER_TILE_START_ROW + ANSWER_TILE_ROWS - 1

export const HOME_LEFT_TILE_CENTER_COLUMN =
  HOME_LEFT_TILE_START_COL + (ANSWER_TILE_COLS - 1) / 2
export const HOME_RIGHT_TILE_CENTER_COLUMN =
  HOME_RIGHT_TILE_START_COL + (ANSWER_TILE_COLS - 1) / 2
export const HOME_ANSWER_TILE_CENTER_ROW =
  HOME_ANSWER_TILE_START_ROW + ANSWER_TILE_ROWS / 2 - 0.5

// Map a grid index to world-space X/Z centered around the origin
function indexToWorld(value: number, count: number): number {
  return (value - count / 2 + 0.5) * TILE_SIZE
}

export function generateHomeRowData(): HomeRowData[] {
  const rows: HomeRowData[] = Array.from({ length: HOME_ROWS }, () => ({
    heights: new Array<number>(HOME_COLUMNS).fill(SAFE_HEIGHT),
    answerNumber: new Array<number>(HOME_COLUMNS).fill(0),
  }))

  const leftEndCol = HOME_LEFT_TILE_START_COL + ANSWER_TILE_COLS - 1
  const rightEndCol = HOME_RIGHT_TILE_START_COL + ANSWER_TILE_COLS - 1

  for (let row = HOME_ANSWER_TILE_START_ROW; row <= HOME_ANSWER_TILE_END_ROW; row++) {
    const rowData = rows[row]
    for (let col = 0; col < HOME_COLUMNS; col++) {
      const onLeftTile = col >= HOME_LEFT_TILE_START_COL && col <= leftEndCol
      const onRightTile = col >= HOME_RIGHT_TILE_START_COL && col <= rightEndCol

      if (onLeftTile) {
        rowData.answerNumber[col] = 1
        continue
      }

      if (onRightTile) {
        rowData.answerNumber[col] = 2
        continue
      }

      rowData.heights[col] = UNSAFE_HEIGHT
    }
  }

  return rows
}

export function buildHomePlatform(): HomeBuildResult {
  const rows = generateHomeRowData()
  const total = HOME_COLUMNS * HOME_ROWS
  const instances: InstancedRigidBodyProps[] = new Array(total)
  const instanceVisibility = new Float32Array(total)
  const instanceSeed = new Float32Array(total)
  const instanceAnswerNumber = new Float32Array(total)

  let i = 0
  for (let row = 0; row < HOME_ROWS; row++) {
    const z = indexToWorld(row, HOME_ROWS)
    const rowData = rows[row]
    for (let col = 0; col < HOME_COLUMNS; col++) {
      const x = indexToWorld(col, HOME_COLUMNS)
      const y = rowData.heights[col]

      instanceVisibility[i] = y === SAFE_HEIGHT ? 1 : 0
      instanceSeed[i] = Math.random()
      instanceAnswerNumber[i] = rowData.answerNumber[col] ?? 0

      instances[i] = {
        key: `home-${row}-${col}`,
        position: [x, y, z],
        userData: { type: 'home', rowIndex: row, colIndex: col },
      }

      i++
    }
  }

  return { instances, instanceVisibility, instanceSeed, instanceAnswerNumber }
}
