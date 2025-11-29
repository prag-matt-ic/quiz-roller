import { MOVE_HUD_INDICATOR } from '@/resources/content'
import type { RowData } from '@/utils/tiles'

import { PLAYER_INITIAL_POSITION_VEC3, RESET_PLAYER_STATE } from './playerSlice'
import { RESET_TIME_STATE } from './timeSlice'
import { createTotalCounts } from './totalCounts'
import { GameMode, GameSlice, GameSliceCreator, Stage } from './types'

export const RESET_GAME_STATE = {
  stage: Stage.HOME,
  totalCounts: createTotalCounts(),
  currentRow: 0,
  cameraLookAtPosition: null,
  isPlatformReady: false,
  rowsData: [] as RowData[],
}

export const createGameSlice: GameSliceCreator<GameSlice> = (set, get) => ({
  ...RESET_GAME_STATE,
  htmlPortal: undefined,
  _isHydrated: false,
  resetPlatformTick: 0,
  mode: GameMode.MAIN,
  hudIndicator: MOVE_HUD_INDICATOR,
  setHydrated: () => {
    set({ _isHydrated: true })
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
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[GameSlice] Setting rows data`, { totalCounts })
    }
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
    set((s) => {
      const isModeChange = s.mode !== mode
      const nextRowsData = isModeChange ? [] : [...s.rowsData]
      return {
        ...RESET_GAME_STATE,
        ...RESET_TIME_STATE,
        ...RESET_PLAYER_STATE,
        mode,
        rowsData: nextRowsData,
        totalCounts: isModeChange ? createTotalCounts() : s.totalCounts,
        speedRunStage: speedRunStage ?? RESET_TIME_STATE.speedRunStage,
        playerStatus: 'respawning',
        spawnPosition: PLAYER_INITIAL_POSITION_VEC3.clone(),
        playerRespawnTick: s.playerRespawnTick + 1,
        playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3.clone(),
        resetPlatformTick: s.resetPlatformTick + 1,
      }
    })
  },
})
