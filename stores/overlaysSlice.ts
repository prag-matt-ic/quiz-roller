import { type GameSliceCreator, Overlay, type OverlaysSlice, SpeedRunStage } from './types'

export const createOverlaysSlice: GameSliceCreator<OverlaysSlice> = (set) => {
  return {
    overlay: Overlay.LANDING,
    setOverlay: (overlay: Overlay) => {
      if (overlay === Overlay.SPEEDRUN_START) {
        set({ overlay, speedRunStage: SpeedRunStage.START })
        return
      }
      set({ overlay })
    },
  }
}
