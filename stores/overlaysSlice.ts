import { type GameSliceCreator, type OverlaysSlice, type SpeedRunStage } from './types'

export const getSpeedRunOverlays = (stage: SpeedRunStage, isSpeedRunMode: boolean) => ({
  isShowingSpeedRunStartOverlay:
    isSpeedRunMode && (stage === 'countdown' || stage === 'username'),
  isShowingSpeedRunEndOverlay:
    isSpeedRunMode && (stage === 'submitting' || stage === 'leaderboard'),
})

export const createOverlaysSlice: GameSliceCreator<OverlaysSlice> = (set) => ({
  isShowingDashboard: false,
  isShowingSpeedRunEndOverlay: false,
  isShowingSpeedRunStartOverlay: false,
  isShowingLoadingOverlay: true,
  setIsShowingLoadingOverlay: (isVisible) => {
    set({ isShowingLoadingOverlay: isVisible })
  },
  setIsShowingDashboard: (isShowingDashboard) => {
    set({ isShowingDashboard })
  },
  setSpeedRunOverlays: (stage, isSpeedRunMode) => {
    set(getSpeedRunOverlays(stage, isSpeedRunMode))
  },
})
