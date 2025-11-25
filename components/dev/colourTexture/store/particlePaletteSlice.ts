import type { StateCreator } from 'zustand'

import {
  DEFAULT_PARTICLE_PALETTE_CONFIG,
  generateParticlePalette,
  normalizeHexColor,
} from '../particlePalette/generator'
import { PARTICLE_RANGE_KEYS, type ParticlePaletteConfig } from '../particlePalette/types'
import { clamp } from '../utils'
import type { ColourTextureStore, ParticlePaletteSlice } from './types'

const DEFAULT_PARTICLE_INPUTS = ['#00fcdf', '#00f0d0', '#00ffff']

const cloneConfig = (config: ParticlePaletteConfig): ParticlePaletteConfig =>
  PARTICLE_RANGE_KEYS.reduce(
    (acc, key) => {
      acc[key] = { ...config[key] }
      return acc
    },
    {} as ParticlePaletteConfig,
  )

const computeResult = (inputs: string[], config: ParticlePaletteConfig) =>
  generateParticlePalette(inputs, config)

const clampVariance = (value: number) => clamp(value, 0, 0.5)

export const createParticlePaletteSlice: StateCreator<
  ColourTextureStore,
  [['zustand/persist', unknown], ['zustand/subscribeWithSelector', never]],
  [],
  ParticlePaletteSlice
> = (set, get) => ({
  particlePalette: {
    inputs: DEFAULT_PARTICLE_INPUTS,
    draft: '',
    config: cloneConfig(DEFAULT_PARTICLE_PALETTE_CONFIG),
    error: null,
    result: computeResult(DEFAULT_PARTICLE_INPUTS, DEFAULT_PARTICLE_PALETTE_CONFIG),
  },
  setParticlePaletteDraft: (draft: string) =>
    set((state) => ({
      particlePalette: {
        ...state.particlePalette,
        draft,
      },
    })),
  addParticlePaletteInput: (value?: string) => {
    const candidate = (value ?? get().particlePalette.draft).trim()
    if (!candidate) return
    try {
      const normalized = normalizeHexColor(candidate)
      set((state) => {
        if (state.particlePalette.inputs.includes(normalized)) {
          return {
            particlePalette: {
              ...state.particlePalette,
              draft: '',
              error: null,
            },
          }
        }
        const inputs = [normalized, ...state.particlePalette.inputs]
        return {
          particlePalette: {
            ...state.particlePalette,
            inputs,
            draft: '',
            error: null,
            result: computeResult(inputs, state.particlePalette.config),
          },
        }
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid colour value'
      set((state) => ({
        particlePalette: {
          ...state.particlePalette,
          error: message,
        },
      }))
    }
  },
  removeParticlePaletteInput: (hex: string) =>
    set((state) => {
      const inputs = state.particlePalette.inputs.filter((value) => value !== hex)
      return {
        particlePalette: {
          ...state.particlePalette,
          inputs,
          result: computeResult(inputs, state.particlePalette.config),
        },
      }
    }),
  setParticleRangeEnabled: (key, enabled) =>
    set((state) => {
      const config = {
        ...state.particlePalette.config,
        [key]: {
          ...state.particlePalette.config[key],
          enabled,
        },
      }
      return {
        particlePalette: {
          ...state.particlePalette,
          config,
          result: computeResult(state.particlePalette.inputs, config),
        },
      }
    }),
  setParticleRangeCount: (key, count) =>
    set((state) => {
      const safeCount = Math.max(0, Math.round(count))
      const config = {
        ...state.particlePalette.config,
        [key]: {
          ...state.particlePalette.config[key],
          count: safeCount,
        },
      }
      return {
        particlePalette: {
          ...state.particlePalette,
          config,
          result: computeResult(state.particlePalette.inputs, config),
        },
      }
    }),
  setParticleRangeVariance: (key, variance) =>
    set((state) => {
      const config = {
        ...state.particlePalette.config,
        [key]: {
          ...state.particlePalette.config[key],
          variance: clampVariance(variance),
        },
      }
      return {
        particlePalette: {
          ...state.particlePalette,
          config,
          result: computeResult(state.particlePalette.inputs, config),
        },
      }
    }),
  regenerateParticlePalette: () =>
    set((state) => ({
      particlePalette: {
        ...state.particlePalette,
        result: computeResult(state.particlePalette.inputs, state.particlePalette.config),
      },
    })),
  clearParticlePaletteError: () =>
    set((state) => ({
      particlePalette: {
        ...state.particlePalette,
        error: null,
      },
    })),
  resetParticlePalette: () =>
    set(() => ({
      particlePalette: {
        inputs: DEFAULT_PARTICLE_INPUTS,
        draft: '',
        config: cloneConfig(DEFAULT_PARTICLE_PALETTE_CONFIG),
        error: null,
        result: computeResult(DEFAULT_PARTICLE_INPUTS, DEFAULT_PARTICLE_PALETTE_CONFIG),
      },
    })),
})
