import { create } from 'zustand'

export type SimFps = 0 | 30 | 60 | 120

type DebugState = {
  // Debug/testing: simulate fixed-step updates at a target FPS. 0 = uncapped
  simFps: SimFps
  setSimFps: (fps: SimFps) => void
}

export const useDebugStore = create<DebugState>((set) => ({
  simFps: 0,
  setSimFps: (fps) => set({ simFps: fps }),
}))

