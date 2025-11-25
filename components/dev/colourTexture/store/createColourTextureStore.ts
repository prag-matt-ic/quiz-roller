import { createStore } from 'zustand'
import { persist, subscribeWithSelector, type PersistOptions } from 'zustand/middleware'

import { createColourSlice } from './colourSlice'
import { createDisplaySlice } from './displaySlice'
import { createParticlePaletteSlice } from './particlePaletteSlice'
import { createPresetSlice } from './presetSlice'
import { createTextureSlice } from './textureSlice'
import type { ColourTextureStore } from './types'

type PersistedStore = Pick<
  ColourTextureStore,
  | 'name'
  | 'hex'
  | 'params'
  | 'config'
  | 'display'
  | 'userColours'
  | 'texturePresets'
  | 'particlePalette'
>

export const createColourTextureStore = () =>
  createStore<ColourTextureStore>()(
    subscribeWithSelector(
      persist<ColourTextureStore, [], [], PersistedStore>(
        (...a) => ({
          ...createColourSlice(...a),
          ...createTextureSlice(...a),
          ...createDisplaySlice(...a),
          ...createPresetSlice(...a),
          ...createParticlePaletteSlice(...a),
        }),
        {
          name: 'colour-texture-dev',
          version: 6,
          partialize: (state) =>
            ({
              name: state.name,
              hex: state.hex,
              params: state.params,
              config: state.config,
              display: state.display,
              userColours: state.userColours,
              texturePresets: state.texturePresets,
              particlePalette: state.particlePalette,
            }) as PersistedStore,
        } as PersistOptions<ColourTextureStore, PersistedStore>,
      ),
    ),
  )
