import { createStore } from 'zustand'
import { persist, subscribeWithSelector, type PersistOptions } from 'zustand/middleware'

import { createColourSlice } from './colourSlice'
import { createTextureSlice } from './textureSlice'
import type { ColourTextureStore } from './types'

type PersistedStore = Pick<ColourTextureStore, 'hex' | 'params' | 'config'>

export const createColourTextureStore = () =>
  createStore<ColourTextureStore>()(
    subscribeWithSelector(
      persist<ColourTextureStore, [], [], PersistedStore>(
        (...a) => ({
          ...createColourSlice(...a),
          ...createTextureSlice(...a),
        }),
        {
          name: 'colour-texture-dev',
          version: 1,
          partialize: (state) =>
            ({
              hex: state.hex,
              params: state.params,
              config: state.config,
            }) as PersistedStore,
        } as PersistOptions<ColourTextureStore, PersistedStore>,
      ),
    ),
  )
