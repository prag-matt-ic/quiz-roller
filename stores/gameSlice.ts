import type { RowData } from '@/utils/tiles'

import { getResetInputState } from './inputSlice'
import { PLAYER_INITIAL_POSITION, RESET_PLAYER_STATE } from './playerSlice'
import { RESET_TIME_STATE } from './timeSlice'
import { createTotalCounts } from './totalCounts'
import { GameMode, type GameSlice, type GameSliceCreator, Stage } from './types'

export const RESET_GAME_STATE = {
  totalCounts: createTotalCounts(),
  currentRow: 0,
  cameraLookAtPosition: null,
  isPlatformReady: false,
  rowsData: [] as RowData[],
}

export const createGameSlice: GameSliceCreator<GameSlice> = (set, get) => ({
  ...RESET_GAME_STATE,
  stage: Stage.HOME,
  htmlPortal: undefined,
  _isHydrated: false,
  isShowingLoadingOverlay: true,
  isShowingDashboard: false,
  resetPlatformTick: 0,
  mode: GameMode.MAIN,
  hudIndicator: null,
  setHydrated: () => {
    set({ _isHydrated: true })
  },
  setIsShowingLoadingOverlay: (isVisible) => {
    set({ isShowingLoadingOverlay: isVisible })
  },
  setIsShowingDashboard: (isShowingDashboard) => {
    set({ isShowingDashboard })
  },
  setHtmlPortal: (htmlPortal) => {
    set({ htmlPortal })
  },
  setHudIndicator: (indicator) => {
    set({ hudIndicator: indicator })
  },
  setCurrentRow: (currentRow) => {
    set({ currentRow })
  },
  setCameraLookAtPosition: (cameraLookAtPosition) => {
    set({ cameraLookAtPosition })
  },
  setPlatformReady: (isPlatformReady) => {
    set({ isPlatformReady })
  },
  setRowsData: (rowsData, totalCounts) => {
    set({ rowsData, totalCounts, isPlatformReady: false })
  },
  goToStage: (newStage: Stage) => {
    if (newStage === Stage.HOME) {
      set({ stage: Stage.HOME })
    }
    if (newStage === Stage.INFO) {
      set({ stage: Stage.INFO })
    }
    if (newStage === Stage.OBSTACLES) {
      set({ stage: Stage.OBSTACLES })
    }
    if (newStage === Stage.CTA) {
      set({ stage: Stage.CTA })
    }
  },
  resetGame: ({ mode, speedRunStage }) => {
    get().stopConfirmation()

    const isModeChange = get().mode !== mode
    const nextRowsData = isModeChange ? [] : get().rowsData

    set((s) => {
      return {
        ...RESET_GAME_STATE,
        ...RESET_PLAYER_STATE,
        ...RESET_TIME_STATE,
        ...getResetInputState(),
        mode,
        rowsData: nextRowsData,
        totalCounts: isModeChange ? createTotalCounts() : s.totalCounts,
        speedRunStage: speedRunStage ?? RESET_TIME_STATE.speedRunStage,
        playerStatus: s.playerStatus === 'idle' ? 'idle' : 'respawning',
        spawnPosition: s.playerStatus === 'idle' ? null : [...PLAYER_INITIAL_POSITION],
        playerRespawnTick: s.playerRespawnTick + 1,
        playerPosition: PLAYER_INITIAL_POSITION,
        resetPlatformTick: s.resetPlatformTick + 1,
      }
    })
  },
})
