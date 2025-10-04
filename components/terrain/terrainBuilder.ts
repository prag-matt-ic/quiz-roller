import { createNoise2D } from 'simplex-noise'

// Grid configuration
export const COLUMNS = 16
export const ROWS_VISIBLE = 40
export const BOX_SIZE = 1
export const BOX_SPACING = 1

// Answer tile fixed sizing (in world units, aligned to grid columns/rows)
export const ANSWER_TILE_COLS = 5
export const ANSWER_TILE_ROWS = 2
export const ANSWER_TILE_SIDE_MARGIN_COLS = 2
export const ANSWER_ROW_GAP_ROWS = 2 // vertical gap between answer rows when there are 4 tiles

export const ANSWER_TILE_WIDTH = ANSWER_TILE_COLS * BOX_SIZE
export const ANSWER_TILE_HEIGHT = ANSWER_TILE_ROWS * BOX_SIZE
export const QUESTION_TEXT_MAX_WIDTH = 8 * BOX_SIZE

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

  const SAFE_PADDING_ROWS = 2 // First rows always fully unblocked

  // Use simplex 2D as 1D noise by fixing Y=seed
  const noise2D = createNoise2D()
  const noise1D = (i: number) => noise2D(i * freq, seed) // [-1, 1]

  const heights: number[][] = new Array(rows)
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

  for (let i = 0; i < rows; i++) {
    // First rows always fully open
    if (i < SAFE_PADDING_ROWS) {
      heights[i] = new Array<number>(COLUMNS).fill(openHeight)
      continue
    }

    // Last rows always fully open
    if (i > rows - SAFE_PADDING_ROWS) {
      heights[i] = new Array<number>(COLUMNS).fill(openHeight)
      continue
    }

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

  return heights
}

// --- Shared placement helpers ---

// Convert a grid column index (can be fractional for centers) to world X.
export const colToX = (col: number) => (col - COLUMNS / 2 + 0.5) * BOX_SPACING

// Compute world positions for question text and answer tiles within a 12-row question section.
// Rows are indexed front (near player) to back relative to startZ:
// 0,1 empty; 2-4 text; 5 empty; answers from row 6 onward.
export function computeQuestionPlacement(startZ: number, tileCount: number) {
  // Columns: two tiles per row, each spanning 4 columns, starting at col 1 and 7

  const LEFT_START_COL = 2
  const RIGHT_START_COL = 9
  const leftCenterCol = LEFT_START_COL + (ANSWER_TILE_COLS - 1) / 2 // 2.5
  const rightCenterCol = RIGHT_START_COL + (ANSWER_TILE_COLS - 1) / 2 // 8.5

  // Text spans rows 2,3,4 — center at row 3
  const TEXT_CENTER_ROW = 3
  const textPos: [number, number, number] = [
    colToX(COLUMNS / 2 - 0.5),
    0.01,
    startZ - TEXT_CENTER_ROW * BOX_SPACING,
  ]

  // Answer tiles: height = 2 rows. Placement bands:
  // - 2 answers: rows 6..8 reserved -> center row = 7
  // - 4 answers: two rows: 6..7 (center 6.5), gap at 8, and 9..10 (center 9.5)
  const tilePositions: [number, number, number][] = []
  if (tileCount === 4) {
    const topCenterRow = 6.5
    const bottomCenterRow = 9.5
    tilePositions.push(
      [colToX(leftCenterCol), 0.001, startZ - topCenterRow * BOX_SPACING],
      [colToX(rightCenterCol), 0.001, startZ - topCenterRow * BOX_SPACING],
      [colToX(leftCenterCol), 0.001, startZ - bottomCenterRow * BOX_SPACING],
      [colToX(rightCenterCol), 0.001, startZ - bottomCenterRow * BOX_SPACING],
    )
  } else {
    const centerRow = 9
    tilePositions.push(
      [colToX(leftCenterCol), 0.001, startZ - centerRow * BOX_SPACING],
      [colToX(rightCenterCol), 0.001, startZ - centerRow * BOX_SPACING],
    )
  }

  return { textPos, tilePositions }
}
