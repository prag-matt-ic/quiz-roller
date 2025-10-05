import { createNoise2D } from 'simplex-noise'

// Grid configuration
export const COLUMNS = 16
export const ROWS_VISIBLE = 40
export const TILE_SIZE = 1
export const TILE_THICKNESS = 0.16
// Heights
export const SAFE_HEIGHT = -TILE_SIZE / 2 // top of tile at y=0
export const UNSAFE_HEIGHT = -40 // sunken obstacles

export const QUESTION_SECTION_ROWS = 16
export const OBSTACLE_SECTION_ROWS = 64

// Answer tile fixed sizing (in world units, aligned to grid columns/rows)
export const ANSWER_TILE_COLS = 6
export const ANSWER_TILE_ROWS = 4
export const ANSWER_TILE_WIDTH = ANSWER_TILE_COLS * TILE_SIZE
export const ANSWER_TILE_HEIGHT = ANSWER_TILE_ROWS * TILE_SIZE
export const QUESTION_TEXT_MAX_WIDTH = 8 * TILE_SIZE
export const QUESTION_TEXT_FONT_SIZE = 0.4
export const QUESTION_TEXT_ROWS = 4

export const MAX_Z = TILE_SIZE * 6

type ObstacleParams = {
  rows: number // e.g. 256
  seed?: number // deterministic if you want; defaults Math.random()
  minWidth: number // minimum open corridor width (>=1)
  maxWidth: number // starting width (e.g. 4)
  movePerRow: number // max lateral shift (cells) per row (reachability)
  freq: number // noise frequency (0.05..0.2)
  notchChance: number // 0..1 small chance to nibble corridor edge
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
export function generateObstacleHeights(params: ObstacleParams): number[][] {
  const {
    rows,
    seed = Math.random() * 10_000,
    minWidth,
    maxWidth,
    movePerRow,
    freq,
    notchChance,
  } = params

  const SAFE_PADDING_ROWS = 1

  // Use simplex 2D as 1D noise by fixing Y=seed
  const noise2D = createNoise2D()
  const noise1D = (i: number) => noise2D(i * freq, seed) // [-1, 1]

  const heights: number[][] = new Array(rows)

  console.warn('Generating obstacle heights with params:', params)

  // First rows always fully open
  for (let i = 0; i < SAFE_PADDING_ROWS; i++) {
    heights[i] = new Array<number>(COLUMNS).fill(SAFE_HEIGHT)
  }

  const centerStart = Math.floor(COLUMNS / 2)
  let cPrev = centerStart

  // width "breathes" and gently shrinks across the batch
  const widthAt = (i: number) => {
    const t = i / rows
    const wiggle = noise1D(i * 0.25 + 100) * 0.5 + 0.5 // [0,1]
    const base = lerp(maxWidth, minWidth, t) // shrink over batch
    const knock = wiggle > 0.7 ? 1 : 0
    return clamp(Math.round(base - knock), minWidth, maxWidth)
  }

  // Generate obstacle rows between the leading and trailing padding zones.
  for (let i = SAFE_PADDING_ROWS; i < rows - SAFE_PADDING_ROWS; i++) {
    const rowHeights = new Array<number>(COLUMNS).fill(UNSAFE_HEIGHT)

    // Soft target center from noise, then cap drift for reachability
    const n = noise1D(i) // [-1,1]
    const target = Math.round((n + 1) * 0.5 * (COLUMNS - 3)) + 1 // keep off hard edges
    const c = clamp(stepToward(cPrev, target, movePerRow), 0, COLUMNS - 1)
    const w = widthAt(i)

    // Corridor indices
    const halfL = Math.floor((w - 1) / 2)
    const halfR = Math.ceil((w - 1) / 2)
    const L = clamp(c - halfL, 0, COLUMNS - 1)
    const R = clamp(c + halfR, 0, COLUMNS - 1)

    // Open the corridor
    for (let col = L; col <= R; col++) rowHeights[col] = SAFE_HEIGHT

    // Optional notch: nibble corridor edge but never seal it
    if (Math.random() < notchChance && w >= 2) {
      const sideLeft = Math.random() < 0.5
      const notchWidth = Math.min(2, w - 1) // preserve ≥1 open cell
      if (sideLeft) {
        for (let k = 0; k < notchWidth; k++) rowHeights[L + k] = UNSAFE_HEIGHT
      } else {
        for (let k = 0; k < notchWidth; k++) rowHeights[R - k] = UNSAFE_HEIGHT
      }
      // Ensure at least one cell open
      let anyOpen = false
      for (let col = L; col <= R; col++)
        if (rowHeights[col] === SAFE_HEIGHT) {
          anyOpen = true
          break
        }
      if (!anyOpen) rowHeights[c] = SAFE_HEIGHT // reopen center if we accidentally sealed it
    }

    heights[i] = rowHeights
    cPrev = c
  }

  // Last rows always fully open
  for (let i = rows - SAFE_PADDING_ROWS; i < rows; i++) {
    heights[i] = new Array<number>(COLUMNS).fill(SAFE_HEIGHT)
  }

  console.log('Generated obstacle heights:', { heights })

  return heights
}

// --- Shared placement helpers ---

// Convert a grid column index (can be fractional for centers) to world X.
export const colToX = (col: number) => (col - COLUMNS / 2 + 0.5) * TILE_SIZE

// Compute world positions for question text and answer tiles within a 12-row question section.
// Rows are indexed front (near player) to back relative to startZ:
// 0,1 empty; 2-4 text; 5 empty; answers from row 6 onward.
export function positionQuestionAndAnswerTiles(
  startZ: number,
  tileCount: number,
): {
  textPos: [number, number, number]
  tilePositions: [number, number, number][]
} {
  if (tileCount === 2) return positionTwoAnswerTiles(startZ)
  return positionFourAnswerTiles(startZ)
}

const ANSWER_TILE_Y = SAFE_HEIGHT + TILE_THICKNESS * 0.5 + 0.005

function positionFourAnswerTiles(startZ: number): {
  textPos: [number, number, number]
  tilePositions: [number, number, number][]
} {
  const textCenterRowIndex = 3.5
  const textPos: [number, number, number] = [
    colToX(COLUMNS / 2 - 0.5),
    ANSWER_TILE_Y,
    startZ - textCenterRowIndex * TILE_SIZE,
  ]

  const tilePositions: [number, number, number][] = []
  const leftCenterCol = 1 + (ANSWER_TILE_COLS - 1) / 2 // 2.5
  const rightCenterCol = 9 + (ANSWER_TILE_COLS - 1) / 2 // 8.5

  const topCenterRow = 7.5
  const bottomCenterRow = topCenterRow + ANSWER_TILE_ROWS + 1 // spacing row
  tilePositions.push(
    [colToX(leftCenterCol), ANSWER_TILE_Y, startZ - topCenterRow * TILE_SIZE],
    [colToX(rightCenterCol), ANSWER_TILE_Y, startZ - topCenterRow * TILE_SIZE],
    [colToX(leftCenterCol), ANSWER_TILE_Y, startZ - bottomCenterRow * TILE_SIZE],
    [colToX(rightCenterCol), ANSWER_TILE_Y, startZ - bottomCenterRow * TILE_SIZE],
  )

  return { textPos, tilePositions }
}

function positionTwoAnswerTiles(startZ: number): {
  textPos: [number, number, number]
  tilePositions: [number, number, number][]
} {
  const textCenterRowIndex = 5.5
  const textPos: [number, number, number] = [
    colToX(COLUMNS / 2 - 0.5),
    ANSWER_TILE_Y,
    startZ - textCenterRowIndex * TILE_SIZE,
  ]

  const tilePositions: [number, number, number][] = []
  const leftCenterCol = 1 + (ANSWER_TILE_COLS - 1) / 2
  const rightCenterCol = 9 + (ANSWER_TILE_COLS - 1) / 2

  const tilesCenterRow = 10.5
  tilePositions.push(
    [colToX(leftCenterCol), ANSWER_TILE_Y, startZ - tilesCenterRow * TILE_SIZE],
    [colToX(rightCenterCol), ANSWER_TILE_Y, startZ - tilesCenterRow * TILE_SIZE],
  )

  return { textPos, tilePositions }
}

// Generate question section heights. For the first question (four-tile layout),
// leave all cells open. For subsequent questions (two-tile layout), close
// cells outside the answer tile footprints across the tile row band so the
// player must pass over a tile to proceed.
export function generateQuestionHeights(params: { isFirstQuestion: boolean }): number[][] {
  const { isFirstQuestion } = params

  // Start fully open
  const heights: number[][] = Array.from({ length: QUESTION_SECTION_ROWS }, () =>
    new Array<number>(COLUMNS).fill(SAFE_HEIGHT),
  )

  if (isFirstQuestion) return heights

  // Derive the two-tile footprint used by positionTwoAnswerTiles()
  const leftStartCol = 1
  const leftEndCol = leftStartCol + ANSWER_TILE_COLS - 1
  const rightStartCol = 9
  const rightEndCol = rightStartCol + ANSWER_TILE_COLS - 1

  const tilesCenterRow = 10.5
  const startRow = Math.ceil(tilesCenterRow - ANSWER_TILE_ROWS / 2)
  const endRow = startRow + ANSWER_TILE_ROWS - 1

  for (let r = startRow; r <= endRow; r++) {
    if (r < 0 || r >= QUESTION_SECTION_ROWS) continue
    const row = heights[r]
    for (let c = 0; c < COLUMNS; c++) {
      const inLeft = c >= leftStartCol && c <= leftEndCol
      const inRight = c >= rightStartCol && c <= rightEndCol
      if (!inLeft && !inRight) row[c] = UNSAFE_HEIGHT
    }
  }

  return heights
}
