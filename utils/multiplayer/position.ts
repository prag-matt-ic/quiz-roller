import { Quaternion, Vector3, type Vector3Tuple } from 'three'

/**
 * Multiplayer Position & Interpolation Utilities
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

// ============================================================================
// TYPES
// ============================================================================

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
 * Pre-allocated vectors and quaternions for a remote player
 * Reusing these avoids per-frame allocations (performance optimization)
 */
export type InterpolationState = {
  currentPos: Vector3
  targetPos: Vector3
  currentQuat: Quaternion
  targetQuat: Quaternion
}

// ============================================================================
// COORDINATE CONVERSION
// ============================================================================

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

// ============================================================================
// INTERPOLATION
// ============================================================================

/**
 * Create a new interpolation state with pre-allocated objects
 * Call this once per remote player
 */
export function createInterpolationState(
  initialX = 0,
  initialY = 4,
  initialZ = 0,
): InterpolationState {
  return {
    currentPos: new Vector3(initialX, initialY, initialZ),
    targetPos: new Vector3(),
    currentQuat: new Quaternion(),
    targetQuat: new Quaternion(),
  }
}

/**
 * Interpolate position smoothly towards target
 * @param state - Pre-allocated interpolation state
 * @param targetX - Target X position
 * @param targetY - Target Y position
 * @param targetZ - Target Z position
 * @param lerpFactor - Interpolation speed (0-1, higher = more responsive)
 * @returns Current interpolated position
 */
export function interpolatePosition(
  state: InterpolationState,
  targetX: number,
  targetY: number,
  targetZ: number,
  lerpFactor: number,
): Vector3 {
  state.targetPos.set(targetX, targetY, targetZ)
  state.currentPos.lerp(state.targetPos, lerpFactor)
  return state.currentPos
}

/**
 * Interpolate rotation smoothly towards target
 * @param state - Pre-allocated interpolation state
 * @param currentQuat - Current quaternion to interpolate
 * @param targetX - Target quaternion X
 * @param targetY - Target quaternion Y
 * @param targetZ - Target quaternion Z
 * @param targetW - Target quaternion W
 * @param lerpFactor - Interpolation speed (0-1, higher = more responsive)
 * @returns Current interpolated quaternion
 */
export function interpolateRotation(
  state: InterpolationState,
  currentQuat: Quaternion,
  targetX: number,
  targetY: number,
  targetZ: number,
  targetW: number,
  lerpFactor: number,
): Quaternion {
  state.targetQuat.set(targetX, targetY, targetZ, targetW)
  state.currentQuat.copy(currentQuat)
  state.currentQuat.slerp(state.targetQuat, lerpFactor)
  return state.currentQuat
}
