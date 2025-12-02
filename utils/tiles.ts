import { Stage } from '@/stores/types'

// Tile dimensions
export const TILE_SIZE = 1.0
export const TILE_THICKNESS = 0.08
export const TILE_PLAYER_HIGHLIGHT_ROW_COUNT = 4
export const TILE_PLAYER_FADE_FULL_ROWS = 6
export const TILE_PLAYER_FADE_MIN_ROWS = 12
export const TILE_PLAYER_FADE_MIN_ALPHA = 0
export const TILE_PLAYER_HIGHLIGHT_RADIUS = TILE_PLAYER_HIGHLIGHT_ROW_COUNT * TILE_SIZE
export const TILE_PLAYER_FADE_FULL_RADIUS = TILE_PLAYER_FADE_FULL_ROWS * TILE_SIZE
export const TILE_PLAYER_FADE_MIN_RADIUS = TILE_PLAYER_FADE_MIN_ROWS * TILE_SIZE

const ROW_VISIBILITY_BUFFER_ROWS = 6
const ROW_VISIBILITY_BUFFER_RADIUS = ROW_VISIBILITY_BUFFER_ROWS * TILE_SIZE
export const ROW_VISIBILITY_HALF_SPAN =
  TILE_PLAYER_FADE_MIN_RADIUS + ROW_VISIBILITY_BUFFER_RADIUS

const EXIT_LOWER_DURATION_ROWS = 6
const PLATFORM_MAX_Z = TILE_SIZE * 8

export const ENTRY_END_Z = PLATFORM_MAX_Z - 16 * TILE_SIZE - EXIT_LOWER_DURATION_ROWS
export const EXIT_START_Z = PLATFORM_MAX_Z - EXIT_LOWER_DURATION_ROWS * TILE_SIZE

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
export const ROWS_RENDERED = 31

// Heights
export const SAFE_HEIGHT = -TILE_SIZE / 2 // top of tile at y=0
export const UNSAFE_HEIGHT = -100 // sunken obstacles (out of sight)

const HIDE_POSITION_Y = -20 as const
const HIDE_POSITION_Z = 10 as const
export const HIDDEN_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]

export const CONFETTI_ROW_DEPTH = TILE_SIZE

// Y value for elements placed directly on top of tiles
export const ON_TILE_Y = SAFE_HEIGHT + TILE_THICKNESS * 0.5 + 0.005

// Convert a grid column index (can be fractional for centers) to world X.
export const colToX = (col: number): number => (col - COLUMNS / 2 + 0.5) * TILE_SIZE

export function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

// Row index to columns with rings
export type RingLayout = Record<number, number[]>

export type RingPositions = (0 | 1)[]

export type IndexedPlacement = readonly [number, number, number, number]

export type ConfettiPlacement = {
  position: [number, number, number]
  width: number
  depth: number
  contentIndex: number
}

export type RowData = {
  heights: number[]
  stage: Stage
  isSectionStart: boolean
  isSectionEnd: boolean
  rowIndex?: number
  ringPositions?: RingPositions
  isHighlighted?: number[] // 0 = not highlighted, 1 = highlighted
  infoZonePlacements?: IndexedPlacement[] // Info zones rendered on the platform
  collectiblePlacements?: IndexedPlacement[] // Collectibles rendered on the platform
  floatingHeadingPlacements?: IndexedPlacement[] // Floating heading above the platform but still aligned to the row
  finishLinePosition?: [number, number, number] // Finish line position
  confettiPlacements?: ConfettiPlacement[] // Confetti platforms rendered on the platform
}
