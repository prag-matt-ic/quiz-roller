import { ANSWER_TILE_Y, colToX, COLUMNS, SAFE_HEIGHT, TILE_SIZE, UNSAFE_HEIGHT } from './tiles'

// Extend intro/entry section to push the first question further back
// Entry rows are sized to fit intro banners with padding
export const INTRO_SECTION_ROWS = 16
export const OBSTACLE_SECTION_ROWS = 64

// Terrain scrolling and animation constants
export const INITIAL_ROWS_Z_OFFSET = TILE_SIZE * 6
export const DECEL_EASE_POWER = 6
export const DECEL_START_OFFSET_ROWS = 6
export const OBSTACLE_BUFFER_SECTIONS = 10

// Answer tile fixed sizing (in world units, aligned to grid columns/rows)
export const QUESTION_SECTION_ROWS = 16
export const QUESTION_TEXT_WIDTH = 8 * TILE_SIZE
export const QUESTION_TEXT_ROWS = 4
export const QUESTION_TEXT_HEIGHT = QUESTION_TEXT_ROWS * TILE_SIZE
export const ANSWER_TILE_COUNT = 2
export const ANSWER_TILE_COLS = 6
export const ANSWER_TILE_ROWS = 4
export const ANSWER_TILE_WIDTH = ANSWER_TILE_COLS * TILE_SIZE
export const ANSWER_TILE_HEIGHT = ANSWER_TILE_ROWS * TILE_SIZE

// Entry lift animation config (rows -> world units via TILE_SIZE)
export const ENTRY_Y_OFFSET = 1 // How far down to start when entering (world units)
export const ENTRY_RAISE_DURATION_ROWS = 4
export const EXIT_LOWER_DURATION_ROWS = 4
export const MAX_Z = TILE_SIZE * 12

// Fixed entry window values for row raising animation
export const QUESTIONS_ENTRY_END_Z =
  MAX_Z - QUESTION_SECTION_ROWS * TILE_SIZE - EXIT_LOWER_DURATION_ROWS
export const QUESTIONS_ENTRY_START_Z =
  QUESTIONS_ENTRY_END_Z - ENTRY_RAISE_DURATION_ROWS * TILE_SIZE
// Exit window values for row lowering (pre-wrap)
export const QUESTIONS_EXIT_END_Z = MAX_Z
export const QUESTIONS_EXIT_START_Z =
  QUESTIONS_EXIT_END_Z - EXIT_LOWER_DURATION_ROWS * TILE_SIZE

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

export function generateQuestionSectionRowData(): RowData[] {
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
