// Grid configuration
export const COLUMNS = 16
export const ROWS_VISIBLE = 28
export const TILE_SIZE = 1
export const TILE_THICKNESS = 0.16
// Heights
export const SAFE_HEIGHT = -TILE_SIZE / 2 // top of tile at y=0
export const UNSAFE_HEIGHT = -40 // sunken obstacles

// Convert a grid column index (can be fractional for centers) to world X.
export const colToX = (col: number): number => (col - COLUMNS / 2 + 0.5) * TILE_SIZE

export const ANSWER_TILE_Y = SAFE_HEIGHT + TILE_THICKNESS * 0.5 + 0.005

export function clamp(x: number, a: number, b: number): number {
  return Math.max(a, Math.min(b, x))
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}
