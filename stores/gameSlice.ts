import { MOVE_HUD_INDICATOR } from '@/resources/content'
import { GameSlice, GameSliceCreator, Stage } from './types'
import { INITIAL_TIME_STATE } from './timeSlice'
import { INITIAL_PLAYER_STATE, PLAYER_INITIAL_POSITION_VEC3 } from './playerSlice'

export const INITIAL_GAME_STATE = {
  stage: Stage.HOME,
  infoContentIndex: 0,
  paletteIndex: 0 as 0 | 1 | 2,
  hudIndicator: MOVE_HUD_INDICATOR,
  totalRows: 100,
  currentRow: 0,
  cameraLookAtPosition: null,
  resetPlatformTick: 0,
  isPlatformReady: false,
  _isHydrated: false,
}

export const createGameSlice: GameSliceCreator<GameSlice> = (set, get) => ({
  ...INITIAL_GAME_STATE,
  setHydrated: () => {
    set({ _isHydrated: true })
  },
  setInfoContentIndex: (index) => {
    set({ infoContentIndex: index })
  },
  setHudIndicator: (indicator) => {
    set({ hudIndicator: indicator })
  },
  setTotalRows: (totalRows) => {
    set({ totalRows })
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
      isSpeedRunMode,
      speedRunStage: speedRunStage ?? s.speedRunStage,
      playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3.clone(),
      totalTimeS: s.totalTimeS,
      paletteIndex: s.paletteIndex,
      isPlatformReady: false,
      resetPlatformTick: s.resetPlatformTick + 1,
      resetPlayerTick: s.resetPlayerTick + 1,
    }))
  },
})
