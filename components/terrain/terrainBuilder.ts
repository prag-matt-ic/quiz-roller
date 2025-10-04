import { createNoise2D } from 'simplex-noise'

// Grid configuration
export const COLUMNS = 16
export const ROWS_VISIBLE = 40
export const BOX_SIZE = 1

export const QUESTION_SECTION_ROWS = 16
export const OBSTACLE_SECTION_ROWS = 64

// Answer tile fixed sizing (in world units, aligned to grid columns/rows)
export const ANSWER_TILE_COLS = 6
export const ANSWER_TILE_ROWS = 4
export const ANSWER_TILE_WIDTH = ANSWER_TILE_COLS * BOX_SIZE
export const ANSWER_TILE_HEIGHT = ANSWER_TILE_ROWS * BOX_SIZE
export const QUESTION_TEXT_MAX_WIDTH = 8 * BOX_SIZE
export const QUESTION_TEXT_FONT_SIZE = 0.4
export const QUESTION_TEXT_ROWS = 4

export const MAX_Z = BOX_SIZE * 6

type ObstacleParams = {
  rows: number // e.g. 256
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
export function generateObstacleHeights(params: ObstacleParams): number[][] {
  const {
    rows,
    seed = Math.random() * 10_000,
    minWidth,
    maxWidth,
    movePerRow,
    freq,
    notchChance,
    openHeight = 0,
    blockedHeight = -1000,
  } = params

  const SAFE_PADDING_ROWS = 1

  // Use simplex 2D as 1D noise by fixing Y=seed
  const noise2D = createNoise2D()
  const noise1D = (i: number) => noise2D(i * freq, seed) // [-1, 1]

  const heights: number[][] = new Array(rows)

  console.warn('Generating obstacle heights with params:', params)

  // First rows always fully open
  for (let i = 0; i < SAFE_PADDING_ROWS; i++) {
    heights[i] = new Array<number>(COLUMNS).fill(openHeight)
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
    const rowHeights = new Array<number>(COLUMNS).fill(blockedHeight)

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

  // Last rows always fully open
  for (let i = rows - SAFE_PADDING_ROWS; i < rows; i++) {
    heights[i] = new Array<number>(COLUMNS).fill(openHeight)
  }

  console.log('Generated obstacle heights:', { heights })

  return heights
}

// --- Shared placement helpers ---

// Convert a grid column index (can be fractional for centers) to world X.
export const colToX = (col: number) => (col - COLUMNS / 2 + 0.5) * BOX_SIZE

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

function positionFourAnswerTiles(startZ: number): {
  textPos: [number, number, number]
  tilePositions: [number, number, number][]
} {
  const textCenterRowIndex = 3.5
  const textPos: [number, number, number] = [
    colToX(COLUMNS / 2 - 0.5),
    0.01,
    startZ - textCenterRowIndex * BOX_SIZE,
  ]

  const tilePositions: [number, number, number][] = []
  const leftCenterCol = 1 + (ANSWER_TILE_COLS - 1) / 2 // 2.5
  const rightCenterCol = 9 + (ANSWER_TILE_COLS - 1) / 2 // 8.5

  const topCenterRow = 7.5
  const bottomCenterRow = topCenterRow + ANSWER_TILE_ROWS + 1 // spacing row
  tilePositions.push(
    [colToX(leftCenterCol), 0.001, startZ - topCenterRow * BOX_SIZE],
    [colToX(rightCenterCol), 0.001, startZ - topCenterRow * BOX_SIZE],
    [colToX(leftCenterCol), 0.001, startZ - bottomCenterRow * BOX_SIZE],
    [colToX(rightCenterCol), 0.001, startZ - bottomCenterRow * BOX_SIZE],
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
    0.01,
    startZ - textCenterRowIndex * BOX_SIZE,
  ]

  const tilePositions: [number, number, number][] = []
  const leftCenterCol = 1 + (ANSWER_TILE_COLS - 1) / 2
  const rightCenterCol = 9 + (ANSWER_TILE_COLS - 1) / 2

  const tilesCenterRow = 10.5
  tilePositions.push(
    [colToX(leftCenterCol), 0.001, startZ - tilesCenterRow * BOX_SIZE],
    [colToX(rightCenterCol), 0.001, startZ - tilesCenterRow * BOX_SIZE],
  )

  return { textPos, tilePositions }
}
