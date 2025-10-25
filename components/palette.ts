// Typescript color helpers

import { css, CSS_LEVEL4, oklch, rgb as toLinearRgb, srgb } from '@thi.ng/color'
import { type Vector3Tuple } from 'three'

type PaletteGradientMode = 'rgb' | 'oklch'

type PaletteSampleOptions = {
  steps?: number
  mode?: PaletteGradientMode
}

export type PaletteGradientOptions = PaletteSampleOptions & {
  angle?: number
}

/**
 * Cosine-based palette function
 * https://iquilezles.org/articles/palettes/
 *
 * @param t - Parameter in range [0, 1]
 * @param a - DC offset (base color)
 * @param b - Amplitude
 * @param c - Frequency
 * @param d - Phase offset
 * @returns RGB color as Vector3Tuple with values in [0, 1]
 */
export function palette(
  t: number,
  a: Vector3Tuple,
  b: Vector3Tuple,
  c: Vector3Tuple,
  d: Vector3Tuple,
): Vector3Tuple {
  const TAU = Math.PI * 2
  return [
    a[0] + b[0] * Math.cos(TAU * (c[0] * t + d[0])),
    a[1] + b[1] * Math.cos(TAU * (c[1] * t + d[1])),
    a[2] + b[2] * Math.cos(TAU * (c[2] * t + d[2])),
  ]
}

/**
 * Get color from the default palette (matching the GLSL implementation)
 * Uses the same IQ cosine palette parameters as palette.glsl
 *
 * @param t - Parameter in range [0, 1]
 * @returns RGB color as Vector3Tuple with values in [0, 1]
 */
export function getColourFromPalette(t: number): Vector3Tuple {
  // IQ cosine palette parameters (a, b, c, d)
  const a: Vector3Tuple = [0.5, 0.5, 0.5]
  const b: Vector3Tuple = [0.5, 0.5, 0.5]
  const c: Vector3Tuple = [1.0, 1.0, 0.5]
  const d: Vector3Tuple = [0.8, 0.9, 0.3]

  return palette(t, a, b, c, d)
}

/**
 * Convert RGB color (0-1 range) to CSS hex string
 *
 * @param rgb - RGB color as Vector3Tuple with values in [0, 1]
 * @returns CSS hex color string (e.g., "#ff8800")
 */
const clampUnit = (value: number): number => Math.min(1, Math.max(0, value))

const toSrgbColor = (rgb: Vector3Tuple) =>
  srgb(clampUnit(rgb[0]), clampUnit(rgb[1]), clampUnit(rgb[2]), 1)

const toSrgbCss = (rgb: Vector3Tuple): string => css(toSrgbColor(rgb))

const toOklchCss = (rgb: Vector3Tuple): string =>
  css(oklch(toLinearRgb(toSrgbColor(rgb))), CSS_LEVEL4)

const formatCssNumber = (value: number, fractionDigits = 4): string =>
  value.toFixed(fractionDigits).replace(/\.?0+$/, '')

/**
 * Convert RGB color (0-1 range) to CSS hex string
 */
export function rgbToHex(rgb: Vector3Tuple): string {
  return toSrgbCss(rgb)
}

/**
 * Convert RGB color (0-1 range) to CSS color string (currently srgb hex)
 */
export function rgbToCss(rgb: Vector3Tuple): string {
  return toSrgbCss(rgb)
}

/**
 * Get color from palette as CSS hex string
 *
 * @param t - Parameter in range [0, 1]
 * @returns CSS hex color string
 */
export function getPaletteHex(t: number): string {
  return rgbToHex(getColourFromPalette(t))
}

/**
 * Get color from palette as CSS rgb string
 *
 * @param t - Parameter in range [0, 1]
 * @returns CSS rgb color string
 */
export function getPaletteCss(t: number): string {
  return rgbToCss(getColourFromPalette(t))
}
const getSampleColour = (t: number, mode: PaletteGradientMode): string => {
  const colour = getColourFromPalette(t)
  return mode === 'oklch' ? toOklchCss(colour) : toSrgbCss(colour)
}

const createStopStrings = (
  start: number,
  end: number,
  { steps = GRADIENT_STEPS, mode = 'rgb' }: PaletteSampleOptions = {},
): string[] => {
  const safeSteps = Math.max(2, steps)
  const denominator = safeSteps - 1
  const range = end - start

  return Array.from({ length: safeSteps }, (_, index) => {
    const ratio = denominator === 0 ? 0 : index / denominator
    const t = start + ratio * range
    const position = ratio * 100
    return `${getSampleColour(t, mode)} ${formatCssNumber(position, 2)}%`
  })
}

export const createPaletteStopString = (
  start: number,
  end: number,
  options?: PaletteSampleOptions,
): string => createStopStrings(start, end, options).join(', ')

export const createPaletteGradient = (
  start: number,
  end: number,
  { angle = 90, ...rest }: PaletteGradientOptions = {},
): string => `linear-gradient(${angle}deg, ${createPaletteStopString(start, end, rest)})`

export const createPaletteCustomProperties = (
  prefix: string,
  start: number,
  end: number,
  { steps = GRADIENT_STEPS, mode = 'rgb' }: PaletteSampleOptions = {},
): Record<string, string> => {
  const safeSteps = Math.max(2, steps)
  const denominator = safeSteps - 1
  const range = end - start

  return Array.from({ length: safeSteps }, (_, index) => {
    const ratio = denominator === 0 ? 0 : index / denominator
    const t = start + ratio * range
    return [index, getSampleColour(t, mode)] as const
  }).reduce<Record<string, string>>((acc, [index, color]) => {
    acc[`${prefix}-${index}`] = color
    return acc
  }, {})
}

// ---------------- Colour Range UI helpers ----------------
// IMPORTANT: If you edit these ranges, also update the GLSL counterpart
// in `components/paletteRange.glsl` (paletteRange function) so UI and shaders
// stay in sync.

export type ColourRange = { min: number; max: number; center: number }

export const GRADIENT_STEPS = 8

// Keep these in sync with paletteRange.glsl
export const COLOUR_RANGES: readonly ColourRange[] = [
  { min: 0.0, max: 0.5, center: 0.25 },
  { min: 0.25, max: 0.75, center: 0.5 },
  { min: 0.5, max: 1.0, center: 0.75 },
] as const

// Pre-compute gradient stops for each range
export const GRADIENT_STOPS: readonly string[] = COLOUR_RANGES.map((range) => {
  return createPaletteStopString(range.min, range.max, {
    steps: GRADIENT_STEPS,
    mode: 'rgb',
  })
})
