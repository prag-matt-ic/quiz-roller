import { MOVE_HUD_INDICATOR } from '@/resources/content'
import { GameMode, GameSlice, GameSliceCreator, Stage } from './types'
import { INITIAL_TIME_STATE } from './timeSlice'
import { INITIAL_PLAYER_STATE, PLAYER_INITIAL_POSITION_VEC3 } from './playerSlice'
import type { RowData } from '@/utils/tiles'
import { createTotalCounts } from './totalCounts'

export const INITIAL_GAME_STATE = {
  stage: Stage.HOME,
  hudIndicator: MOVE_HUD_INDICATOR,
  totalCounts: createTotalCounts(),
  currentRow: 0,
  cameraLookAtPosition: null,
  resetPlatformTick: 0,
  isPlatformReady: false,
  mode: GameMode.MAIN,
  rowsData: [] as RowData[],
  htmlPortal: undefined,
  _isHydrated: false,
}

export const createGameSlice: GameSliceCreator<GameSlice> = (set, get) => ({
  ...INITIAL_GAME_STATE,
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
  setMode: (mode) => {
    set((state) => {
      if (state.mode === mode) return {}
      return {
        mode,
        rowsData: [],
        totalCounts: createTotalCounts(),
        isPlatformReady: false,
        resetPlatformTick: state.resetPlatformTick + 1,
      }
    })
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
        ...INITIAL_GAME_STATE,
        ...INITIAL_TIME_STATE,
        ...INITIAL_PLAYER_STATE,
        mode,
        rowsData: nextRowsData,
        totalCounts: isModeChange ? createTotalCounts() : s.totalCounts,
        completedSpeedRuns: s.completedSpeedRuns,
        speedRunStage: speedRunStage ?? INITIAL_TIME_STATE.speedRunStage,
        playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3.clone(),
        totalTimeS: s.totalTimeS,
        isPlatformReady: false,
        resetPlatformTick: s.resetPlatformTick + 1,
        respawnPlayerTick: s.respawnPlayerTick + 1,
      }
    })
  },
})
