import { createNoise2D } from 'simplex-noise'

import {
  INTRO_BANNERS_CONTENT,
  INTRO_BANNERS_END_PADDING_ROWS,
  INTRO_BANNERS_SPACING_ROWS,
  INTRO_BANNERS_START_PADDING_ROWS,
} from '@/resources/intro'

// Grid configuration
export const COLUMNS = 16
export const ROWS_VISIBLE = 32
export const TILE_SIZE = 1
export const TILE_THICKNESS = 0.16
// Heights
export const SAFE_HEIGHT = -TILE_SIZE / 2 // top of tile at y=0
export const UNSAFE_HEIGHT = -40 // sunken obstacles
// Entry lift animation config (rows -> world units via TILE_SIZE)
export const ENTRY_Y_OFFSET = 1 // How far down to start when entering (world units)
export const ENTRY_RAISE_DURATION_ROWS = 4
export const EXIT_LOWER_DURATION_ROWS = 4
export const MAX_Z = TILE_SIZE * 12

// Extend intro/entry section to push the first question further back
// Entry rows are sized to fit intro banners with padding
export const INTRO_SECTION_ROWS =
  INTRO_BANNERS_START_PADDING_ROWS +
  Math.max(0, INTRO_BANNERS_CONTENT.length - 1) * INTRO_BANNERS_SPACING_ROWS +
  INTRO_BANNERS_END_PADDING_ROWS
export const OBSTACLE_SECTION_ROWS = 64

// Terrain scrolling and animation constants
export const INITIAL_ROWS_Z_OFFSET = TILE_SIZE * 6
export const INTRO_MIN_SPEED = 0.25
export const INTRO_SPEED_FAR_FACTOR = 0.5
export const DECEL_EASE_POWER = 6
export const DECEL_START_OFFSET_ROWS = 6
export const OBSTACLE_BUFFER_SECTIONS = 10

// Answer tile fixed sizing (in world units, aligned to grid columns/rows)
export const QUESTION_SECTION_ROWS = 16
export const QUESTION_TEXT_WIDTH = 8 * TILE_SIZE
export const QUESTION_TEXT_ROWS = 4
export const QUESTION_TEXT_HEIGHT = QUESTION_TEXT_ROWS * TILE_SIZE
export const ANSWER_TILE_COUNT = 4
export const ANSWER_TILE_COLS = 6
export const ANSWER_TILE_ROWS = 4
export const ANSWER_TILE_WIDTH = ANSWER_TILE_COLS * TILE_SIZE
export const ANSWER_TILE_HEIGHT = ANSWER_TILE_ROWS * TILE_SIZE

// Fixed entry window values for row raising animation
export const ENTRY_END_Z = MAX_Z - QUESTION_SECTION_ROWS * TILE_SIZE - EXIT_LOWER_DURATION_ROWS
export const ENTRY_START_Z = ENTRY_END_Z - ENTRY_RAISE_DURATION_ROWS * TILE_SIZE
// Exit window values for row lowering (pre-wrap)
export const EXIT_END_Z = MAX_Z
export const EXIT_START_Z = EXIT_END_Z - EXIT_LOWER_DURATION_ROWS * TILE_SIZE

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
    seed = Math.random(),
    minWidth,
    maxWidth,
    movePerRow,
    freq,
    notchChance,
  } = params

  // Hard-coded taper band lengths for easing in/out of the obstacle corridor
  const TAPER_IN_ROWS = 8
  const TAPER_OUT_ROWS = 8

  // Use simplex 2D as 1D noise by fixing Y=seed
  const noise2D = createNoise2D()
  const noise1D = (i: number) => noise2D(i * freq, seed) // [-1, 1]

  const heights: number[][] = new Array(rows)

  // width "breathes" and gently shrinks across the batch
  const widthAt = (i: number) => {
    const t = i / rows
    const wiggle = noise1D(i * 0.25 + 100) * 0.5 + 0.5 // [0,1]
    const base = lerp(maxWidth, minWidth, t) // shrink over batch
    const knock = wiggle > 0.7 ? 1 : 0
    return clamp(Math.round(base - knock), minWidth, maxWidth)
  }

  const centerStart = Math.floor(COLUMNS / 2)
  let cPrev = centerStart
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
    const rowHeights = new Array<number>(COLUMNS).fill(UNSAFE_HEIGHT)

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
    for (let col = L; col <= R; col++) rowHeights[col] = SAFE_HEIGHT

    // Optional notch: nibble corridor edge but never seal it
    // Skip notches during taper rows to keep the transition clean
    if (!inTaperIn && !inTaperOut && Math.random() < notchChance && wEff >= 2) {
      const sideLeft = Math.random() < 0.5
      const notchWidth = Math.min(2, wEff - 1) // preserve ≥1 open cell
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

  return heights
}

// --- Shared placement helpers ---

// Convert a grid column index (can be fractional for centers) to world X.
export const colToX = (col: number) => (col - COLUMNS / 2 + 0.5) * TILE_SIZE

const ANSWER_TILE_Y = SAFE_HEIGHT + TILE_THICKNESS * 0.5 + 0.005

export type SectionType = 'intro' | 'question' | 'obstacles'

export type RowData = {
  heights: number[]
  type: SectionType
  isSectionStart: boolean
  isSectionEnd: boolean
  questionTextPosition?: [number, number, number] // If true, when this row is visible, position Q text here
  // Optional per-index answer tile placements for this trigger row.
  // Use null for indices that should not be placed on this trigger.
  // Example: for a 4-tile layout, top trigger provides [pos, pos, null, null],
  // bottom trigger provides [null, null, pos, pos].
  answerTilePositions?: ([number, number, number] | null)[]
  // Per-column answer number: 0=not under answer, 1=under answer 1, 2=under answer 2, etc.
  answerNumber?: number[]
}

// --- Intro section ---
// Intro rows with a 6-column central safe corridor; everything else sunken.
export const INTRO_OPEN_COLS = 6

export function getIntroCorridorBounds() {
  const startCol = Math.floor((COLUMNS - INTRO_OPEN_COLS) / 2)
  const endCol = startCol + INTRO_OPEN_COLS - 1
  return { startCol, endCol }
}

export function generateIntroSectionRowData(): RowData[] {
  const rows: RowData[] = new Array(INTRO_SECTION_ROWS)
  const { startCol, endCol } = getIntroCorridorBounds()

  for (let i = 0; i < INTRO_SECTION_ROWS; i++) {
    const heights = new Array<number>(COLUMNS).fill(UNSAFE_HEIGHT)
    for (let c = startCol; c <= endCol; c++) heights[c] = SAFE_HEIGHT
    rows[i] = {
      heights,
      type: 'intro',
      isSectionStart: i === 0,
      isSectionEnd: i === INTRO_SECTION_ROWS - 1,
    }
  }
  return rows
}

export function generateFirstQuestionSectionRowData(): RowData[] {
  // All rows open; no UNSAFE_HEIGHT anywhere for first question
  const heights: number[][] = Array.from({ length: QUESTION_SECTION_ROWS }, () =>
    new Array<number>(COLUMNS).fill(SAFE_HEIGHT),
  )

  // Layout goals for first question:
  // - Question text appears before any answers
  // - Two answer tile rows with a 2-row gap between them

  // Gap between the two answer rows (in whole grid rows)
  const ANSWER_ROW_GAP = 2

  // Place the top answer row starting a bit into the section to keep
  // a small buffer from the leading edge. This keeps everything within
  // the 16-row window while providing the requested 2-row gap.
  const topStartRow = 4
  const topCenterRow = topStartRow + ANSWER_TILE_ROWS / 2 - 0.5 // 4.5
  const topTriggerRow = Math.ceil(topCenterRow)
  const topZRelative = (topTriggerRow - topCenterRow) * TILE_SIZE

  // Bottom answer row starts after the top row plus the explicit gap
  const bottomStartRow = topStartRow + ANSWER_TILE_ROWS + ANSWER_ROW_GAP // 3 + 4 + 2 = 9
  const bottomCenterRow = bottomStartRow + ANSWER_TILE_ROWS / 2 - 0.5 // 10.5
  const bottomTriggerRow = Math.ceil(bottomCenterRow)
  const bottomZRelative = (bottomTriggerRow - bottomCenterRow) * TILE_SIZE

  // Bring the question text forward so it can be read before answers.
  // Center it ahead of the top answer row.
  const questionTextCenterRow = 2.5
  const textTriggerRow = Math.ceil(questionTextCenterRow)
  const textZRelative = (textTriggerRow - questionTextCenterRow) * TILE_SIZE

  const leftCenterCol = 1 + (ANSWER_TILE_COLS - 1) / 2
  const rightCenterCol = 9 + (ANSWER_TILE_COLS - 1) / 2
  const zRelTop = topZRelative
  const zRelBottom = bottomZRelative

  // Calculate answer tile ownership for four-tile layout
  const leftStartCol = 1
  const leftEndCol = leftStartCol + ANSWER_TILE_COLS - 1
  const rightStartCol = 9
  const rightEndCol = rightStartCol + ANSWER_TILE_COLS - 1
  const topStartRowComputed = Math.ceil(topCenterRow - ANSWER_TILE_ROWS / 2)
  const topEndRow = topStartRowComputed + ANSWER_TILE_ROWS - 1
  const bottomStartRowComputed = Math.ceil(bottomCenterRow - ANSWER_TILE_ROWS / 2)
  const bottomEndRow = bottomStartRowComputed + ANSWER_TILE_ROWS - 1

  const rows: RowData[] = new Array(QUESTION_SECTION_ROWS)
  for (let i = 0; i < QUESTION_SECTION_ROWS; i++) {
    const isStart = i === 0
    const isEnd = i === QUESTION_SECTION_ROWS - 1

    // Compute ownership array for this row
    const ownership = new Array<number>(COLUMNS).fill(0)
    // Top-left tile (answer 1)
    if (i >= topStartRowComputed && i <= topEndRow) {
      for (let c = leftStartCol; c <= leftEndCol; c++) ownership[c] = 1
    }
    // Top-right tile (answer 2)
    if (i >= topStartRowComputed && i <= topEndRow) {
      for (let c = rightStartCol; c <= rightEndCol; c++) ownership[c] = 2
    }
    // Bottom-left tile (answer 3)
    if (i >= bottomStartRowComputed && i <= bottomEndRow) {
      for (let c = leftStartCol; c <= leftEndCol; c++) ownership[c] = 3
    }
    // Bottom-right tile (answer 4)
    if (i >= bottomStartRowComputed && i <= bottomEndRow) {
      for (let c = rightStartCol; c <= rightEndCol; c++) ownership[c] = 4
    }

    rows[i] = {
      heights: heights[i],
      type: 'question',
      isSectionStart: isStart,
      isSectionEnd: isEnd,
      answerNumber: ownership,
    }
    if (i === textTriggerRow) {
      rows[i].questionTextPosition = [colToX(COLUMNS / 2 - 0.5), ANSWER_TILE_Y, textZRelative]
    }
    if (i === topTriggerRow) {
      // Place top-left (index 0) and top-right (index 1) only
      rows[i].answerTilePositions = [
        [colToX(leftCenterCol), ANSWER_TILE_Y, zRelTop],
        [colToX(rightCenterCol), ANSWER_TILE_Y, zRelTop],
        null,
        null,
      ]
    }
    if (i === bottomTriggerRow) {
      // Place bottom-left (index 2) and bottom-right (index 3) only
      rows[i].answerTilePositions = [
        null,
        null,
        [colToX(leftCenterCol), ANSWER_TILE_Y, zRelBottom],
        [colToX(rightCenterCol), ANSWER_TILE_Y, zRelBottom],
      ]
    }
  }
  return rows
}

export function generateSubsequentQuestionSectionRowData(): RowData[] {
  // Start fully open, then carve out non-tile areas within tile rows
  const heights: number[][] = Array.from({ length: QUESTION_SECTION_ROWS }, () =>
    new Array<number>(COLUMNS).fill(SAFE_HEIGHT),
  )

  // Text appears first, then answers further down the section
  const questionTextCenterRow = 5.5
  const textTriggerRow = Math.ceil(questionTextCenterRow + QUESTION_TEXT_ROWS / 2)
  const textZRelative = (textTriggerRow - questionTextCenterRow) * TILE_SIZE

  // Two-tile layout positioned after the text
  const tilesCenterRow = 10.5
  const tilesTriggerRow = Math.ceil(tilesCenterRow)
  const tilesZRelative = (tilesTriggerRow - tilesCenterRow) * TILE_SIZE

  // Carve non-tile areas in rows that contain the answer tile rectangles
  const leftStartCol = 1
  const leftEndCol = leftStartCol + ANSWER_TILE_COLS - 1
  const rightStartCol = 9
  const rightEndCol = rightStartCol + ANSWER_TILE_COLS - 1
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

  const leftCenterCol = 1 + (ANSWER_TILE_COLS - 1) / 2
  const rightCenterCol = 9 + (ANSWER_TILE_COLS - 1) / 2

  const rows: RowData[] = new Array(QUESTION_SECTION_ROWS)

  for (let i = 0; i < QUESTION_SECTION_ROWS; i++) {
    const isStart = i === 0
    const isEnd = i === QUESTION_SECTION_ROWS - 1

    // Compute ownership array for this row (two-tile layout)
    const ownership = new Array<number>(COLUMNS).fill(0)
    // Left tile (answer 1)
    if (i >= startRow && i <= endRow) {
      for (let c = leftStartCol; c <= leftEndCol; c++) ownership[c] = 1
    }
    // Right tile (answer 2)
    if (i >= startRow && i <= endRow) {
      for (let c = rightStartCol; c <= rightEndCol; c++) ownership[c] = 2
    }

    rows[i] = {
      heights: heights[i],
      type: 'question',
      isSectionStart: isStart,
      isSectionEnd: isEnd,
      answerNumber: ownership,
    }
    if (i === textTriggerRow) {
      rows[i].questionTextPosition = [colToX(COLUMNS / 2 - 0.5), ANSWER_TILE_Y, textZRelative]
    }
    if (i === tilesTriggerRow) {
      rows[i].answerTilePositions = [
        [colToX(leftCenterCol), ANSWER_TILE_Y, tilesZRelative],
        [colToX(rightCenterCol), ANSWER_TILE_Y, tilesZRelative],
      ]
    }
  }
  return rows
}

export function generateQuestionSectionRowData({
  isFirstQuestion,
}: {
  isFirstQuestion: boolean
}): RowData[] {
  return isFirstQuestion
    ? generateFirstQuestionSectionRowData()
    : generateSubsequentQuestionSectionRowData()
}
