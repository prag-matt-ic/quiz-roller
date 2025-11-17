// Tile dimensions
export const TILE_SIZE = 1.0
export const TILE_THICKNESS = 0.16
export const TILE_PLAYER_HIGHLIGHT_ROW_COUNT = 4
export const TILE_PLAYER_FADE_FULL_ROWS = 6
export const TILE_PLAYER_FADE_MIN_ROWS = 12
export const TILE_PLAYER_FADE_MIN_ALPHA = 0
export const TILE_PLAYER_HIGHLIGHT_RADIUS = TILE_PLAYER_HIGHLIGHT_ROW_COUNT * TILE_SIZE
export const TILE_PLAYER_FADE_FULL_RADIUS = TILE_PLAYER_FADE_FULL_ROWS * TILE_SIZE
export const TILE_PLAYER_FADE_MIN_RADIUS = TILE_PLAYER_FADE_MIN_ROWS * TILE_SIZE

// Centralized game-wide constants
// Units per second for terrain scrolling when terrainSpeed (normalized) is 1.0
export const TERRAIN_SPEED_UNITS = 7
// Player lateral/forward intended movement speed in world units per second
export const PLAYER_MOVE_UNITS = 7

export const EPSILON = {
  SMALL: 1e-6,
  TINY: 1e-4,
} as const

// Grid configuration
export const COLUMNS = 33 // odd number so that there is a center column
export const ROWS_RENDERED = 32

// Heights
export const SAFE_HEIGHT = -TILE_SIZE / 2 // top of tile at y=0
export const UNSAFE_HEIGHT = -40 // sunken obstacles (out of sight)

export const HIDE_POSITION_Y = -40 as const
export const HIDE_POSITION_Z = 40 as const

// Y value for elements placed directly on top of tiles
export const ON_TILE_Y = SAFE_HEIGHT + TILE_THICKNESS * 0.5 + 0.005

// Entry lift animation config (rows -> world units via TILE_SIZE)
export const INITIAL_ROWS_Z_OFFSET = TILE_SIZE * 8
export const ENTRY_Y_OFFSET = 2.0 // How far down to start when entering (world units)
export const ENTRY_RAISE_DURATION_ROWS = 6
export const EXIT_LOWER_DURATION_ROWS = 6
export const MAX_Z = TILE_SIZE * 8

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

export type SectionType = 'home' | 'info' | 'obstacles' | 'cta' | 'empty'

export type RowData = {
  heights: number[]
  type: SectionType
  isSectionStart: boolean
  isSectionEnd: boolean

  isHighlighted?: number[] // 0 = not highlighted, 1 = highlighted

  infoContentIndex?: number
  tileTextPosition?: [number, number, number] // Text rendered flat on the platform surface (previously question text)
  imagePosition?: [number, number, number] // 2D image rendered on the platform (previously logo)
  infoZonePositions?: ([number, number, number] | null)[] // Info zones rendered on the platform
  floatingHeadingPosition?: [number, number, number] // Floating heading above the platform but still aligned to the row
}
