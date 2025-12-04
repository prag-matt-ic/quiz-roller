import {
  type GameSliceCreator,
  type OverlaySelection,
  type OverlaysSlice,
  type SpeedRunStage,
} from './types'

export const getSpeedRunOverlays = (stage: SpeedRunStage, isSpeedRunMode: boolean) => ({
  isShowingSpeedRunStartOverlay:
    isSpeedRunMode && (stage === 'countdown' || stage === 'username'),
  isShowingSpeedRunEndOverlay:
    isSpeedRunMode && (stage === 'submitting' || stage === 'leaderboard'),
})

export const createOverlaysSlice: GameSliceCreator<OverlaysSlice> = (set) => {
  const selectOverlay = (overlay: OverlaySelection) => {
    set({
      isShowingDashboard: overlay === 'dashboard',
      isShowingSpeedRunStartOverlay: overlay === 'speedrun-start',
      isShowingSpeedRunEndOverlay: overlay === 'speedrun-end',
      isShowingLoadingOverlay: overlay === 'loading',
    })
  }

  return {
    isShowingDashboard: false,
    isShowingSpeedRunEndOverlay: false,
    isShowingSpeedRunStartOverlay: false,
    isShowingLoadingOverlay: true,
    setIsShowingLoadingOverlay: (isVisible) => {
      if (isVisible) {
        selectOverlay('loading')
        return
      }

      set({ isShowingLoadingOverlay: false })
    },
    setIsShowingDashboard: (isShowingDashboard) => {
      if (isShowingDashboard) {
        selectOverlay('dashboard')
        return
      }

      set({ isShowingDashboard })
    },
    setOverlaySelection: selectOverlay,
    setSpeedRunOverlays: (stage, isSpeedRunMode) => {
      const speedRunOverlays = getSpeedRunOverlays(stage, isSpeedRunMode)

      if (speedRunOverlays.isShowingSpeedRunStartOverlay) {
        selectOverlay('speedrun-start')
        return
      }

      if (speedRunOverlays.isShowingSpeedRunEndOverlay) {
        selectOverlay('speedrun-end')
        return
      }

      set(speedRunOverlays)
    },
  }
}
