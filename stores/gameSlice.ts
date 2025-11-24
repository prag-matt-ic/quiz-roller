import { MOVE_HUD_INDICATOR } from '@/resources/content'
import { GameSlice, GameSliceCreator, Stage } from './types'
import { INITIAL_TIME_STATE } from './timeSlice'
import { INITIAL_PLAYER_STATE, PLAYER_INITIAL_POSITION_VEC3 } from './playerSlice'
import type { RowData } from '@/utils/tiles'

export const INITIAL_GAME_STATE = {
  stage: Stage.HOME,
  infoContentIndex: 0,
  hudIndicator: MOVE_HUD_INDICATOR,
  totalRows: 100,
  currentRow: 0,
  cameraLookAtPosition: null,
  resetPlatformTick: 0,
  isPlatformReady: false,
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
  setInfoContentIndex: (index) => {
    set({ infoContentIndex: index })
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
  setRowsData: (rowsData) => {
    set({ rowsData, totalRows: rowsData.length })
  },
  goToStage: (newStage: Stage) => {
    if (newStage === Stage.HOME) {
      set({ stage: Stage.HOME })
    }
    if (newStage === Stage.INFO) {
      set({ stage: Stage.INFO })
    }
    if (newStage === Stage.TERRAIN) {
      set({ stage: Stage.TERRAIN })
    }
    if (newStage === Stage.CTA) {
      set({ stage: Stage.CTA })
    }
  },
  resetGame: ({ isSpeedRunMode, speedRunStage }) => {
    get().stopConfirmation()
    set((s) => ({
      ...INITIAL_GAME_STATE,
      ...INITIAL_TIME_STATE,
      ...INITIAL_PLAYER_STATE,
      completedSpeedRuns: s.completedSpeedRuns,
      isSpeedRunMode,
      speedRunStage: speedRunStage ?? s.speedRunStage,
      playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3.clone(),
      totalTimeS: s.totalTimeS,
      isPlatformReady: false,
      resetPlatformTick: s.resetPlatformTick + 1,
      respawnPlayerTick: s.respawnPlayerTick + 1,
    }))
  },
})
