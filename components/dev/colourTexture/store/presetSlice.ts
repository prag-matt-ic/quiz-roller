import type { StateCreator } from 'zustand'

import type { ColourTextureStore, PresetSlice } from './types'

export const createPresetSlice: StateCreator<
  ColourTextureStore,
  [['zustand/persist', unknown], ['zustand/subscribeWithSelector', never]],
  [],
  PresetSlice
> = (set, get) => ({
  texturePresets: [],
  saveTexturePreset: (name: string) => {
    const state = get()
    const newPreset = {
      id: crypto.randomUUID(),
      name,
      config: state.config,
    }
    set((state) => ({
      texturePresets: [newPreset, ...state.texturePresets],
    }))
  },
  loadTexturePreset: (id: string) => {
    const state = get()
    const preset = state.texturePresets.find((p) => p.id === id)
    if (preset) {
      set({ config: preset.config })
      return
    }

    const userColour = state.userColours.find((c) => c.id === id)
    if (userColour) {
      set({ config: userColour.config })
    }
  },
  deleteTexturePreset: (id: string) => {
    set((state) => ({
      texturePresets: state.texturePresets.filter((p) => p.id !== id),
    }))
  },
})
