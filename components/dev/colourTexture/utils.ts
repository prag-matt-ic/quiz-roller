import type { Vector3Tuple } from 'three'

import {
  DEFAULT_EXPORT_RESOLUTION,
  MAX_EXPORT_RESOLUTION,
  MIN_ASPECT_COMPONENT,
  MIN_EXPORT_RESOLUTION,
  TAU,
} from './store/constants'
import type { CosinePaletteParams } from './store/types'

export const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const clampUnit = (value: number) => clamp(value, 0, 1)

export const clampResolution = (value: number) =>
  clamp(Math.round(value), MIN_EXPORT_RESOLUTION, MAX_EXPORT_RESOLUTION)

export const parseResolutionInput = (value: string) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return DEFAULT_EXPORT_RESOLUTION
  return clampResolution(numericValue)
}

export const parseAspectInput = (value: string) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 1
  return clamp(Math.abs(numericValue), MIN_ASPECT_COMPONENT, Number.MAX_SAFE_INTEGER)
}

export type NormalizedAspectMultipliers = {
  widthMultiplier: number
  heightMultiplier: number
}

export const getNormalizedAspectMultipliers = (
  width: number,
  height: number,
): NormalizedAspectMultipliers => {
  const safeWidth = width <= 0 ? 1 : width
  const safeHeight = height <= 0 ? 1 : height
  const minComponent = Math.min(safeWidth, safeHeight)
  const divisor = minComponent || 1
  return {
    widthMultiplier: safeWidth / divisor,
    heightMultiplier: safeHeight / divisor,
  }
}

export const evaluateCosinePalette = (
  t: number,
  params: CosinePaletteParams,
): Vector3Tuple => {
  const safeT = clampUnit(Number.isFinite(t) ? t : 0)
  return [
    clampUnit(params.a[0] + params.b[0] * Math.cos(TAU * (params.c[0] * safeT + params.d[0]))),
    clampUnit(params.a[1] + params.b[1] * Math.cos(TAU * (params.c[1] * safeT + params.d[1]))),
    clampUnit(params.a[2] + params.b[2] * Math.cos(TAU * (params.c[2] * safeT + params.d[2]))),
  ]
}
