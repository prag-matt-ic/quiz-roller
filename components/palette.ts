// Typescript color helpers
// Based on: https://iquilezles.org/articles/palettes/

import { type Vector3Tuple } from 'three'

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
  const TAU = 6.283185 // 2 * PI

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
export function rgbToHex(rgb: Vector3Tuple): string {
  const r = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255)
  const g = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255)
  const b = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255)

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

/**
 * Convert RGB color (0-1 range) to CSS rgb() string
 *
 * @param rgb - RGB color as Vector3Tuple with values in [0, 1]
 * @returns CSS rgb color string (e.g., "rgb(255, 136, 0)")
 */
export function rgbToCss(rgb: Vector3Tuple): string {
  const r = Math.round(Math.max(0, Math.min(1, rgb[0])) * 255)
  const g = Math.round(Math.max(0, Math.min(1, rgb[1])) * 255)
  const b = Math.round(Math.max(0, Math.min(1, rgb[2])) * 255)

  return `rgb(${r}, ${g}, ${b})`
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

// ---------------- Colour Range UI helpers ----------------
// IMPORTANT: If you edit these ranges, also update the GLSL counterpart
// in `components/paletteRange.glsl` (paletteRange function) so UI and shaders
// stay in sync.

export type ColourRange = { min: number; max: number; center: number }

export const GRADIENT_STEPS = 8

// Keep these in sync with paletteRange.glsl
export const COLOUR_RANGES: readonly ColourRange[] = [
  { min: 0.0, max: 0.4, center: 0.2 },
  { min: 0.3, max: 0.7, center: 0.5 },
  { min: 0.6, max: 1.0, center: 0.8 },
] as const

// Pre-compute gradient stops for each range
export const GRADIENT_STOPS: readonly string[] = COLOUR_RANGES.map((range) => {
  return Array.from({ length: GRADIENT_STEPS }, (_, i) => {
    const t = range.min + (i / (GRADIENT_STEPS - 1)) * (range.max - range.min)
    const pos = (i / (GRADIENT_STEPS - 1)) * 100
    return `${getPaletteHex(t)} ${pos.toFixed(1)}%`
  }).join(', ')
})
