import type { Vector3Tuple } from 'three'

/**
 * Multiplayer Coordinate System Utilities
 *
 * With the ball-movement architecture, position IS the world position.
 * The ball moves through world space rather than the platform scrolling.
 * This greatly simplifies multiplayer synchronization.
 *
 * ARCHITECTURE:
 * - Player position = world position = visual position
 * - No coordinate transformation needed for multiplayer
 * - Remote players use received position directly
 *
 * The toWorldPosition and toLocalPosition functions are kept for backwards
 * compatibility but now act as identity transforms.
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
 * @deprecated With ball-movement architecture, position IS world position
 */
export function toWorldPosition(
  localPosition: Vector3Tuple,
  _platformScroll: Vector3Tuple,
): Position3D {
  // Identity transform - position IS world position now
  return {
    x: localPosition[0],
    y: localPosition[1],
    z: localPosition[2],
  }
}

/**
 * Convert world position from network to local (visual) position
 * @deprecated With ball-movement architecture, position IS visual position
 */
export function toLocalPosition(
  worldPosition: Position3D,
  _platformScroll: Vector3Tuple,
): Position3D {
  // Identity transform - world position IS visual position now
  return {
    x: worldPosition.x,
    y: worldPosition.y,
    z: worldPosition.z,
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
