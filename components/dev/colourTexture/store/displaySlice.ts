import type { StateCreator } from 'zustand'

import {
  CUSTOM_PRESET_ID,
  DEFAULT_ASPECT_VALUE,
  DEFAULT_EXPORT_RESOLUTION,
  PRESET_RESOLUTIONS,
} from './constants'
import type { ColourTextureStore, DisplayConfigState, DisplaySlice } from './types'

const getInitialDisplayConfig = (): DisplayConfigState => ({
  resolutionPresetId: PRESET_RESOLUTIONS[1]?.id ?? CUSTOM_PRESET_ID,
  customResolutionInput: String(DEFAULT_EXPORT_RESOLUTION),
  aspectWidthInput: DEFAULT_ASPECT_VALUE,
  aspectHeightInput: DEFAULT_ASPECT_VALUE,
})

export const createDisplaySlice: StateCreator<
  ColourTextureStore,
  [['zustand/persist', unknown], ['zustand/subscribeWithSelector', never]],
  [],
  DisplaySlice
> = (set) => ({
  display: getInitialDisplayConfig(),
  updateDisplay: (key, value) =>
    set((state) => ({
      display: {
        ...state.display,
        [key]: value,
      },
    })),
  setDisplay: (display) => set({ display }),
})
