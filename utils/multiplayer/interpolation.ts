import { Quaternion, Vector3 } from 'three'

/**
 * Multiplayer Position/Rotation Interpolation Utilities
 *
 * These utilities provide smooth interpolation for remote player movement
 * to avoid jittery motion from network updates.
 */

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
