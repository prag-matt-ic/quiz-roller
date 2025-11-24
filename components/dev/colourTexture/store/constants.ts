import type { CosinePaletteParams, PaletteParamKey, ResolutionPreset } from './types'

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

export const DEFAULT_EXPORT_RESOLUTION = 2048
export const MIN_EXPORT_RESOLUTION = 64
export const MAX_EXPORT_RESOLUTION = 8192
export const CUSTOM_PRESET_ID = 'custom'
export const MIN_ASPECT_COMPONENT = 0.01
export const DEFAULT_ASPECT_VALUE = '1'

export const PRESET_RESOLUTIONS: ResolutionPreset[] = [
  { id: '1k', label: '1K (1024x1024)', width: 1024, height: 1024 },
  { id: '2k', label: '2K (2048x2048)', width: 2048, height: 2048 },
  { id: '4k', label: '4K (4096x4096)', width: 4096, height: 4096 },
]
