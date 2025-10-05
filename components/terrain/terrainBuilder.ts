import { createNoise2D } from 'simplex-noise'

// Grid configuration
export const COLUMNS = 16
export const ROWS_VISIBLE = 40
export const TILE_SIZE = 1

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
  // Easing is hard-coded inside the generator; no external taper params.
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

  // Fixed heights for open vs blocked cells
  const OPEN_HEIGHT = 0
  const BLOCKED_HEIGHT = -1000

  // Hard-coded taper band lengths for easing in/out of the obstacle corridor
  const TAPER_IN_ROWS = 8
  const TAPER_OUT_ROWS = 8

  // Use simplex 2D as 1D noise by fixing Y=seed
  const noise2D = createNoise2D()
  const noise1D = (i: number) => noise2D(i * freq, seed) // [-1, 1]

  const heights: number[][] = new Array(rows)

  console.warn('Generating obstacle heights with params:', params)

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

  // Pre-compute band and clamp taper sizes (no explicit padding rows)
  const innerStart = 0
  const innerEnd = rows - 1 // inclusive
  const innerCount = Math.max(0, rows)
  // Ensure taper bands never overlap even on very small batches
  const tIn = clamp(Math.floor(TAPER_IN_ROWS), 0, Math.floor(innerCount / 2))
  const tOut = clamp(Math.floor(TAPER_OUT_ROWS), 0, Math.floor(innerCount / 2))
  const taperOutStart = innerEnd - tOut + 1 // first row index of taper-out band

  // Generate obstacle rows across the full section (taper handles easing)
  for (let i = innerStart; i <= innerEnd; i++) {
    const rowHeights = new Array<number>(COLUMNS).fill(BLOCKED_HEIGHT)

    // Soft target center from noise, then cap drift for reachability
    const n = noise1D(i) // [-1,1]
    const target = Math.round((n + 1) * 0.5 * (COLUMNS - 3)) + 1 // keep off hard edges
    const c = clamp(stepToward(cPrev, target, movePerRow), 0, COLUMNS - 1)
    const wBase = widthAt(i)

    // Compute effective width with tapering near the ends
    let wEff = wBase
    const inTaperIn = tIn > 0 && i < innerStart + tIn
    const inTaperOut = tOut > 0 && i >= taperOutStart
    if (inTaperIn) {
      // Ease from fully open (COLUMNS) down to the base width
      const t = (i - innerStart + 1) / (tIn + 1)
      wEff = Math.round(lerp(COLUMNS, wBase, t))
    } else if (inTaperOut) {
      // Ease from base width back up to fully open
      const t = (i - taperOutStart + 1) / (tOut + 1)
      wEff = Math.round(lerp(wBase, COLUMNS, t))
    }

    // Keep effective width within sensible bounds
    wEff = clamp(wEff, Math.max(1, minWidth), COLUMNS)

    // Corridor indices
    const halfL = Math.floor((wEff - 1) / 2)
    const halfR = Math.ceil((wEff - 1) / 2)
    const L = clamp(c - halfL, 0, COLUMNS - 1)
    const R = clamp(c + halfR, 0, COLUMNS - 1)

    // Open the corridor
    for (let col = L; col <= R; col++) rowHeights[col] = OPEN_HEIGHT

    // Optional notch: nibble corridor edge but never seal it
    // Skip notches during taper rows to keep the transition clean
    if (!inTaperIn && !inTaperOut && Math.random() < notchChance && wEff >= 2) {
      const sideLeft = Math.random() < 0.5
      const notchWidth = Math.min(2, wEff - 1) // preserve ≥1 open cell
      if (sideLeft) {
        for (let k = 0; k < notchWidth; k++) rowHeights[L + k] = BLOCKED_HEIGHT
      } else {
        for (let k = 0; k < notchWidth; k++) rowHeights[R - k] = BLOCKED_HEIGHT
      }
      // Ensure at least one cell open
      let anyOpen = false
      for (let col = L; col <= R; col++)
        if (rowHeights[col] === OPEN_HEIGHT) {
          anyOpen = true
          break
        }
      if (!anyOpen) rowHeights[c] = OPEN_HEIGHT // reopen center if we accidentally sealed it
    }

    heights[i] = rowHeights
    cPrev = c
  }

  console.warn('Generated obstacle heights:', { heights })

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

function positionFourAnswerTiles(startZ: number): {
  textPos: [number, number, number]
  tilePositions: [number, number, number][]
} {
  const textCenterRowIndex = 3.5
  const textPos: [number, number, number] = [
    colToX(COLUMNS / 2 - 0.5),
    0.01,
    startZ - textCenterRowIndex * TILE_SIZE,
  ]

  const tilePositions: [number, number, number][] = []
  const leftCenterCol = 1 + (ANSWER_TILE_COLS - 1) / 2 // 2.5
  const rightCenterCol = 9 + (ANSWER_TILE_COLS - 1) / 2 // 8.5

  const topCenterRow = 7.5
  const bottomCenterRow = topCenterRow + ANSWER_TILE_ROWS + 1 // spacing row
  tilePositions.push(
    [colToX(leftCenterCol), 0.001, startZ - topCenterRow * TILE_SIZE],
    [colToX(rightCenterCol), 0.001, startZ - topCenterRow * TILE_SIZE],
    [colToX(leftCenterCol), 0.001, startZ - bottomCenterRow * TILE_SIZE],
    [colToX(rightCenterCol), 0.001, startZ - bottomCenterRow * TILE_SIZE],
  )

  return { textPos, tilePositions }
}

// Generate question section heights. For the first question (four-tile layout),
// leave all cells open. For subsequent questions (two-tile layout), close
// cells outside the answer tile footprints across the tile row band so the
// player must pass over a tile to proceed.
export function generateQuestionHeights(params: {
  isFirstQuestion: boolean
  openHeight?: number
  blockedHeight?: number
}): number[][] {
  const { isFirstQuestion, openHeight = 0, blockedHeight = -1000 } = params

  // Start fully open
  const heights: number[][] = Array.from({ length: QUESTION_SECTION_ROWS }, () =>
    new Array<number>(COLUMNS).fill(openHeight),
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
      if (!inLeft && !inRight) row[c] = blockedHeight
    }
  }

  return heights
}

function positionTwoAnswerTiles(startZ: number): {
  textPos: [number, number, number]
  tilePositions: [number, number, number][]
} {
  const textCenterRowIndex = 5.5
  const textPos: [number, number, number] = [
    colToX(COLUMNS / 2 - 0.5),
    0.01,
    startZ - textCenterRowIndex * TILE_SIZE,
  ]

  const tilePositions: [number, number, number][] = []
  const leftCenterCol = 1 + (ANSWER_TILE_COLS - 1) / 2
  const rightCenterCol = 9 + (ANSWER_TILE_COLS - 1) / 2

  const tilesCenterRow = 10.5
  tilePositions.push(
    [colToX(leftCenterCol), 0.001, startZ - tilesCenterRow * TILE_SIZE],
    [colToX(rightCenterCol), 0.001, startZ - tilesCenterRow * TILE_SIZE],
  )

  return { textPos, tilePositions }
}
