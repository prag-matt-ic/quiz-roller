import type { CosinePaletteParams, PaletteParamKey } from './types'

export const TAU = Math.PI * 2
export const DEFAULT_HEX = '#2CC9C9'

export const DEFAULT_PALETTE_PARAMS: CosinePaletteParams = {
  a: [0.5, 0.5, 0.5],
  b: [0.5, 0.5, 0.5],
  c: [1.0, 0.7, 0.4],
  d: [0, 0.15, 0.2],
}

export const PARAMETER_CONFIG: Record<
  PaletteParamKey,
  { label: string; min: number; max: number; step: number }
> = {
  a: { label: 'Offset (a)', min: 0, max: 1, step: 0.01 },
  b: { label: 'Amplitude (b)', min: 0, max: 1, step: 0.01 },
  c: { label: 'Frequency (c)', min: 0, max: 2, step: 0.01 },
  d: { label: 'Phase (d)', min: -1, max: 1, step: 0.01 },
}

export const AXIS_LABELS = ['X', 'Y', 'Z'] as const
