// Tile dimensions
export const TILE_SIZE = 1
export const TILE_THICKNESS = 0.16

export const ANSWER_TILE_COLS = 7
export const ANSWER_TILE_ROWS = 4
export const ANSWER_TILE_WIDTH = ANSWER_TILE_COLS * TILE_SIZE
export const ANSWER_TILE_HEIGHT = ANSWER_TILE_ROWS * TILE_SIZE

// Grid configuration
export const COLUMNS = 16
export const ROWS_RENDERED = 28

// Heights
export const SAFE_HEIGHT = -TILE_SIZE / 2 // top of tile at y=0
export const UNSAFE_HEIGHT = -40 // sunken obstacles (out of sight)

export const HIDE_POSITION_Y = -40 as const
export const HIDE_POSITION_Z = 40 as const

// Y value for elements placed directly on top of tiles
export const ON_TILE_Y = SAFE_HEIGHT + TILE_THICKNESS * 0.5 + 0.005

// Entry lift animation config (rows -> world units via TILE_SIZE)
export const INITIAL_ROWS_Z_OFFSET = TILE_SIZE * 8
export const ENTRY_Y_OFFSET = TILE_THICKNESS * 10 // How far down to start when entering (world units)
export const ENTRY_RAISE_DURATION_ROWS = 4
export const EXIT_LOWER_DURATION_ROWS = 4
export const MAX_Z = TILE_SIZE * 12

// Fixed entry window values for row raising animation
export const ENTRY_END_Z = MAX_Z - 16 * TILE_SIZE - EXIT_LOWER_DURATION_ROWS
export const ENTRY_START_Z = ENTRY_END_Z - ENTRY_RAISE_DURATION_ROWS * TILE_SIZE
// Exit window values for row lowering (pre-wrap)
export const EXIT_END_Z = MAX_Z
export const EXIT_START_Z = EXIT_END_Z - EXIT_LOWER_DURATION_ROWS * TILE_SIZE

// Convert a grid column index (can be fractional for centers) to world X.
export const colToX = (col: number): number => (col - COLUMNS / 2 + 0.5) * TILE_SIZE

export function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export type SectionType = 'home' | 'intro' | 'question' | 'obstacles'

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
  answerNumber?: number[] // Per-column answer number: 0=not under answer, 1=under answer 1, 2=under answer 2, etc.
  logoPosition?: [number, number, number]
  colourPickerPosition?: [number, number, number]
  // Optional per-index info zone placements for this trigger row.
  // Use null to skip moving a specific info zone on this trigger.
  infoZonePositions?: ([number, number, number] | null)[]
}
