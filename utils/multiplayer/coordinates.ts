import type { Vector3Tuple } from 'three'

/**
 * Multiplayer Coordinate System Utilities
 *
 * COORDINATE SPACES:
 * - World Position: Position relative to platform scroll = 0 (network-transmitted)
 * - Local Position: Position relative to current platform scroll (visual rendering)
 *
 * WHY THIS MATTERS:
 * Each player has their own platform scroll position. To synchronize player positions,
 * we broadcast "world position" which is independent of scroll. The receiver then adds
 * their own scroll to get the correct visual position.
 *
 * EXAMPLE:
 * Player A: marbleZ = 50, scrollZ = 40 → worldZ = 10
 * Player B receives worldZ = 10, adds their scrollZ = 35 → visualZ = 45 (correct!)
 */

export type Position3D = {
  x: number
  y: number
  z: number
}

export type Rotation = {
  x: number
  y: number
  z: number
  w: number
}

/**
 * Convert local (visual) position to world position for network transmission
 */
export function toWorldPosition(
  localPosition: Vector3Tuple,
  platformScroll: Vector3Tuple,
): Position3D {
  return {
    x: localPosition[0],
    y: localPosition[1],
    z: localPosition[2] - platformScroll[2],
  }
}

/**
 * Convert world position from network to local (visual) position
 */
export function toLocalPosition(
  worldPosition: Position3D,
  platformScroll: Vector3Tuple,
): Position3D {
  return {
    x: worldPosition.x,
    y: worldPosition.y,
    z: worldPosition.z + platformScroll[2],
  }
}

/**
 * Check if a position has changed significantly (above threshold)
 * Used to avoid unnecessary network broadcasts
 */
export function hasPositionChanged(
  current: Position3D,
  previous: Position3D,
  threshold = 0.001,
): boolean {
  return (
    Math.abs(current.x - previous.x) > threshold ||
    Math.abs(current.y - previous.y) > threshold ||
    Math.abs(current.z - previous.z) > threshold
  )
}
