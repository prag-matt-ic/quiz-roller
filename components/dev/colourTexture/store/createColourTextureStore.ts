import { createStore } from 'zustand'
import { persist, subscribeWithSelector, type PersistOptions } from 'zustand/middleware'

import { createColourSlice } from './colourSlice'
import { createDisplaySlice } from './displaySlice'
import { createPresetSlice } from './presetSlice'
import { createTextureSlice } from './textureSlice'
import type { ColourTextureStore } from './types'

type PersistedStore = Pick<
  ColourTextureStore,
  'name' | 'hex' | 'params' | 'config' | 'display' | 'userColours' | 'texturePresets'
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
        }),
        {
          name: 'colour-texture-dev',
          version: 4,
          partialize: (state) =>
            ({
              name: state.name,
              hex: state.hex,
              params: state.params,
              config: state.config,
              display: state.display,
              userColours: state.userColours,
              texturePresets: state.texturePresets,
            }) as PersistedStore,
        } as PersistOptions<ColourTextureStore, PersistedStore>,
      ),
    ),
  )
