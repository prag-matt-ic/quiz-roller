import { rgb } from '@thi.ng/color'
import type { StateCreator } from 'zustand'
import type { Vector3Tuple } from 'three'

import { DEFAULT_HEX, DEFAULT_PALETTE_PARAMS, PARAMETER_CONFIG } from './constants'
import type {
  ColourSlice,
  ColourTextureStore,
  CosinePaletteParams,
  PaletteParamKey,
} from './types'

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const clampUnit = (value: number) => clamp(value, 0, 1)

const parseHexToTuple = (hexStr: string): Vector3Tuple => {
  try {
    const colour = rgb(hexStr)
    return [clampUnit(colour.r), clampUnit(colour.g), clampUnit(colour.b)]
  } catch {
    return [1, 0.478, 0.094]
  }
}

const guessParamsFromHex = (hexStr: string): CosinePaletteParams => {
  const base = parseHexToTuple(hexStr)
  const inverted = base.map((channel) => 1 - channel) as Vector3Tuple
  const luminance = clampUnit(0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2])
  return {
    a: [
      clampUnit(0.25 + base[0] * 0.5),
      clampUnit(0.25 + base[1] * 0.5),
      clampUnit(0.25 + base[2] * 0.5),
    ],
    b: [
      clampUnit(0.15 + inverted[0] * 0.6),
      clampUnit(0.15 + inverted[1] * 0.6),
      clampUnit(0.15 + inverted[2] * 0.6),
    ],
    c: [
      clamp(0.6 + base[0] * 0.6, 0.25, 1.8),
      clamp(0.6 + base[1] * 0.6, 0.25, 1.8),
      clamp(0.6 + base[2] * 0.6, 0.25, 1.8),
    ],
    d: [
      clamp(0.05 + luminance * 0.35 + inverted[0] * 0.15, -0.5, 1),
      clamp(0.05 + luminance * 0.35 + inverted[1] * 0.15, -0.5, 1),
      clamp(0.05 + luminance * 0.35 + inverted[2] * 0.15, -0.5, 1),
    ],
  }
}

export const createColourSlice: StateCreator<
  ColourTextureStore,
  [['zustand/persist', unknown], ['zustand/subscribeWithSelector', never]],
  [],
  ColourSlice
> = (set, get) => ({
  name: 'My Gradient',
  hex: DEFAULT_HEX,
  params: DEFAULT_PALETTE_PARAMS,
  userColours: [],
  setName: (name: string) => set({ name }),
  setHex: (value: string) => set({ hex: value }),
  seedFromHex: () => {
    const hex = get().hex
    set({ params: guessParamsFromHex(hex) })
  },
  setPaletteParam: (key: PaletteParamKey, axisIndex: number, value: number) => {
    set((state) => {
      const nextVector = [...state.params[key]] as Vector3Tuple
      const config = PARAMETER_CONFIG[key]
      nextVector[axisIndex] = clamp(value, config.min, config.max)
      return {
        params: {
          ...state.params,
          [key]: nextVector,
        },
      }
    })
  },
  saveUserColour: () => {
    const state = get()
    const newColour = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      name: state.name,
      hex: state.hex,
      params: state.params,
      config: state.config,
    }
    set((state) => ({
      userColours: [newColour, ...state.userColours],
    }))
  },
  loadUserColour: (id: string) => {
    const colour = get().userColours.find((c) => c.id === id)
    if (colour) {
      set({
        name: colour.name,
        hex: colour.hex,
        params: colour.params,
        config: colour.config,
      })
    }
  },
  deleteUserColour: (id: string) => {
    set((state) => ({
      userColours: state.userColours.filter((c) => c.id !== id),
    }))
  },
})
