import type { StateCreator } from 'zustand'

import { INITIAL_COLOUR_TEXTURE_UNIFORMS } from '@/components/dev/colourTexture/shaders/ColourTextureShader'

import type { ColourTextureStore, TextureConfigState, TextureSlice } from './types'

export const createInitialTextureConfig = (): TextureConfigState => ({
  grainScale: INITIAL_COLOUR_TEXTURE_UNIFORMS.uGrainScale,
  grainAmplitude: INITIAL_COLOUR_TEXTURE_UNIFORMS.uGrainAmplitude,
  grainMix: INITIAL_COLOUR_TEXTURE_UNIFORMS.uGrainMix,
  fbmScale: INITIAL_COLOUR_TEXTURE_UNIFORMS.uFbmScale,
  fbmOctaves: INITIAL_COLOUR_TEXTURE_UNIFORMS.uFbmOctaves,
  fbmLacunarity: INITIAL_COLOUR_TEXTURE_UNIFORMS.uFbmLacunarity,
  fbmGain: INITIAL_COLOUR_TEXTURE_UNIFORMS.uFbmGain,
  fbmMix: INITIAL_COLOUR_TEXTURE_UNIFORMS.uFbmMix,
  vignetteStrength: INITIAL_COLOUR_TEXTURE_UNIFORMS.uVignetteStrength,
  vignetteRadius: INITIAL_COLOUR_TEXTURE_UNIFORMS.uVignetteRadius,
  vignetteSmoothness: INITIAL_COLOUR_TEXTURE_UNIFORMS.uVignetteSmoothness,
  worleyScale: INITIAL_COLOUR_TEXTURE_UNIFORMS.uWorleyScale,
  worleyJitter: INITIAL_COLOUR_TEXTURE_UNIFORMS.uWorleyJitter,
  worleyManhattan: !!INITIAL_COLOUR_TEXTURE_UNIFORMS.uWorleyManhattan,
  worleyPattern: INITIAL_COLOUR_TEXTURE_UNIFORMS.uWorleyPattern,
  worleyMix: INITIAL_COLOUR_TEXTURE_UNIFORMS.uWorleyMix,
  blackMix: INITIAL_COLOUR_TEXTURE_UNIFORMS.uBlackMix,
  showGradientOverlay: INITIAL_COLOUR_TEXTURE_UNIFORMS.uShowGradientOverlay,
  gradientRange: INITIAL_COLOUR_TEXTURE_UNIFORMS.uGradientRange,
  originX: INITIAL_COLOUR_TEXTURE_UNIFORMS.uOriginOffset.x,
  originY: INITIAL_COLOUR_TEXTURE_UNIFORMS.uOriginOffset.y,
})

export const createTextureSlice: StateCreator<
  ColourTextureStore,
  [['zustand/persist', unknown], ['zustand/subscribeWithSelector', never]],
  [],
  TextureSlice
> = (set) => ({
  config: createInitialTextureConfig(),
  updateConfig: (key, value) =>
    set((state) => ({
      config: {
        ...state.config,
        [key]: value,
      },
    })),
  setConfig: (config) => set({ config }),
})
