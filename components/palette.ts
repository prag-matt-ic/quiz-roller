// Typescript colour helpers aligned with GLSL palettes

import { css, CSS_LEVEL4, oklch, rgb as toLinearRgb, srgb } from '@thi.ng/color'
import { type Vector3Tuple } from 'three'

type PaletteGradientMode = 'rgb' | 'oklch'

type PaletteSampleOptions = {
  steps?: number
  mode?: PaletteGradientMode
  start?: number
  end?: number
}

export type PaletteGradientOptions = PaletteSampleOptions & {
  angle?: number
}

type PaletteParams = {
  a: Vector3Tuple
  b: Vector3Tuple
  c: Vector3Tuple
  d: Vector3Tuple
}

const TAU = Math.PI * 2

// Keep these parameters in sync with components/palette.glsl

const YELLOW_GREEN_PARAMS: PaletteParams = {
  a: [0.5, 0.5, 0.5],
  b: [0.5, 0.5, 0.5],
  c: [1.0, 1.0, 0.5],
  d: [0.8, 0.9, 0.3],
}

const PURPLE_GOLD_PARAMS: PaletteParams = {
  a: [0.5, 0.5, 0.5],
  b: [0.5, 0.5, 0.5],
  c: [1.0, 0.7, 0.4],
  d: [0.0, 0.15, 0.2],
}

const ORANGE_BLUE_PARAMS: PaletteParams = {
  a: [0.5, 0.5, 0.5],
  b: [0.5, 0.5, 0.5],
  c: [0.8, 0.8, 0.5],
  d: [0.0, 0.2, 0.5],
}

const PALETTES: readonly PaletteParams[] = [
  PURPLE_GOLD_PARAMS,
  YELLOW_GREEN_PARAMS,
  ORANGE_BLUE_PARAMS,
] as const

export const PALETTE_COUNT = PALETTES.length
export const GRADIENT_STEPS = 8

export const PURPLE_GOLD_PALETTE_INDEX = 0
export const YELLOW_GREEN_PALETTE_INDEX = 1
export const ORANGE_BLUE_PALETTE_INDEX = 2

const clampUnit = (value: number): number => Math.min(1, Math.max(0, value))

const clampPaletteIndex = (index: number): number => {
  if (!Number.isFinite(index)) return 0
  const rounded = Math.round(index)
  return Math.min(PALETTE_COUNT - 1, Math.max(0, rounded))
}
const clampT = (t: number): number => clampUnit(Number.isFinite(t) ? t : 0)

const cosinePalette = (t: number, { a, b, c, d }: PaletteParams): Vector3Tuple => {
  return [
    a[0] + b[0] * Math.cos(TAU * (c[0] * t + d[0])),
    a[1] + b[1] * Math.cos(TAU * (c[1] * t + d[1])),
    a[2] + b[2] * Math.cos(TAU * (c[2] * t + d[2])),
  ]
}

export function samplePaletteColour(paletteIndex: number, t: number): Vector3Tuple {
  const params = PALETTES[clampPaletteIndex(paletteIndex)]
  return cosinePalette(clampT(t), params)
}

const toSrgbColor = (rgb: Vector3Tuple) =>
  srgb(clampUnit(rgb[0]), clampUnit(rgb[1]), clampUnit(rgb[2]), 1)

const toSrgbCss = (rgb: Vector3Tuple): string => css(toSrgbColor(rgb))

const toOklchCss = (rgb: Vector3Tuple): string =>
  css(oklch(toLinearRgb(toSrgbColor(rgb))), CSS_LEVEL4)

const formatCssNumber = (value: number, fractionDigits = 4): string =>
  value.toFixed(fractionDigits).replace(/\.?0+$/, '')

export function rgbToHex(rgb: Vector3Tuple): string {
  return toSrgbCss(rgb)
}

export function rgbToCss(rgb: Vector3Tuple): string {
  return toSrgbCss(rgb)
}

export function getPaletteHex(paletteIndex: number, t = 0.5): string {
  return rgbToHex(samplePaletteColour(paletteIndex, t))
}

export function getPaletteCss(paletteIndex: number, t = 0.5): string {
  return rgbToCss(samplePaletteColour(paletteIndex, t))
}

const getSampleColour = (
  paletteIndex: number,
  t: number,
  mode: PaletteGradientMode,
): string => {
  const colour = samplePaletteColour(paletteIndex, t)
  return mode === 'oklch' ? toOklchCss(colour) : toSrgbCss(colour)
}

const createStopStrings = (
  paletteIndex: number,
  { steps = GRADIENT_STEPS, mode = 'rgb', start = 0, end = 1 }: PaletteSampleOptions = {},
): string[] => {
  const safeSteps = Math.max(2, steps)
  const denominator = safeSteps - 1
  const range = clampT(end) - clampT(start)

  return Array.from({ length: safeSteps }, (_, index) => {
    const ratio = denominator === 0 ? 0 : index / denominator
    const t = clampT(start + ratio * range)
    const position = ratio * 100
    return `${getSampleColour(paletteIndex, t, mode)} ${formatCssNumber(position, 2)}%`
  })
}

export const createPaletteStopString = (
  paletteIndex: number,
  options?: PaletteSampleOptions,
): string => createStopStrings(paletteIndex, options).join(', ')

export const createPaletteGradient = (
  paletteIndex: number,
  { angle = 90, ...rest }: PaletteGradientOptions = {},
): string => `linear-gradient(${angle}deg, ${createPaletteStopString(paletteIndex, rest)})`

export const createPaletteCustomProperties = (
  prefix: string,
  paletteIndex: number,
  { steps = GRADIENT_STEPS, mode = 'rgb', start = 0, end = 1 }: PaletteSampleOptions = {},
): Record<string, string> => {
  const safeSteps = Math.max(2, steps)
  const denominator = safeSteps - 1
  const range = clampT(end) - clampT(start)

  return Array.from({ length: safeSteps }, (_, index) => {
    const ratio = denominator === 0 ? 0 : index / denominator
    const t = clampT(start + ratio * range)
    return [index, getSampleColour(paletteIndex, t, mode)] as const
  }).reduce<Record<string, string>>((acc, [index, color]) => {
    acc[`${prefix}-${index}`] = color
    return acc
  }, {})
}

export const getPalettePreviewStops = (): readonly string[] =>
  PALETTES.map((_, index) =>
    createPaletteStopString(index, {
      steps: GRADIENT_STEPS,
      mode: 'rgb',
    }),
  )
