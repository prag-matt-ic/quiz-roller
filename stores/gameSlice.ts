import { Vector3Tuple } from 'three'

import { PLATFORM_DATA } from '@/resources/rowsData'
import type { RowData } from '@/utils/tiles'

import { getResetInputState } from './inputSlice'
import { PLAYER_INITIAL_POSITION, RESET_PLAYER_STATE } from './playerSlice'
import { RESET_TIME_STATE } from './timeSlice'
import { createTotalCounts } from './totalCounts'
import {
  CreateGameStoreParams,
  GameMode,
  type GameSlice,
  type GameSliceCreator,
  Overlay,
  SpeedRunStage,
  Stage,
  getOverlayForSpeedRunStage,
} from './types'

const getPlatformDataForMode = (
  mode: GameMode,
): { rowsData: RowData[]; totalCounts: ReturnType<typeof createTotalCounts> } => {
  const modeData = PLATFORM_DATA.modes[mode] ?? PLATFORM_DATA.modes[GameMode.LEARN]
  if (!modeData) {
    return {
      rowsData: [],
      totalCounts: createTotalCounts(),
    }
  }
  return {
    rowsData: modeData.rows,
    totalCounts: { ...modeData.totalCounts },
  }
}

const DEFAULT_PLATFORM_DATA = getPlatformDataForMode(GameMode.LEARN)

export const RESET_GAME_STATE = {
  totalCounts: DEFAULT_PLATFORM_DATA.totalCounts,
  currentRow: 0,
  cameraLookAtPosition: null,
  isPlatformReady: false,
  platformScrollPosition: [0, 0, 0] as Vector3Tuple,
  rowsData: DEFAULT_PLATFORM_DATA.rowsData,
}

export const createGameSlice =
  (
    switchBackgroundTrack: CreateGameStoreParams['switchBackgroundTrack'],
  ): GameSliceCreator<GameSlice> =>
  (set, get) => ({
    ...RESET_GAME_STATE,
    stage: Stage.HOME,
    htmlPortal: undefined,
    _isHydrated: false,
    resetPlatformTick: 0,
    mode: GameMode.LEARN,
    hudIndicator: null,
    setHydrated: (mode: GameMode) => {
      if (mode === GameMode.DEV) {
        set({ _isHydrated: true, ...getPlatformDataForMode(GameMode.DEV) })
      } else {
        set({ _isHydrated: true, mode: GameMode.LEARN })
      }
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
    setPlatformScrollPosition: (platformScrollPosition) => {
      set({ platformScrollPosition })
    },
    setCameraLookAtPosition: (cameraLookAtPosition) => {
      set({ cameraLookAtPosition })
    },
    setIsPlatformReady: (isPlatformReady) => {
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
    resetGame: ({ mode: targetMode, speedRunStage, isHost }) => {
      const { stopConfirmation, mode, overlay } = get()

      stopConfirmation()
      const isModeChange = targetMode !== mode

      if (isModeChange) switchBackgroundTrack(targetMode)

      const nextModeData = getPlatformDataForMode(targetMode)

      const isSpeedRunMode = targetMode === GameMode.SPEEDRUN
      const isMultiplayerMode = targetMode === GameMode.SPEEDRUN_MULTIPLAYER
      const isAnySpeedRunMode = isSpeedRunMode || isMultiplayerMode
      const isShowingLandingOverlay = overlay === Overlay.LANDING

      const nextOverlay = isAnySpeedRunMode
        ? getOverlayForSpeedRunStage(speedRunStage ?? SpeedRunStage.START)
        : isShowingLandingOverlay
          ? Overlay.LANDING
          : Overlay.NONE

      // Calculate spawn position:
      // - For multiplayer: host spawns on left (-1.5), guest spawns on right (+1.5)
      // - For other modes: use default center position
      let spawnPos: Vector3Tuple = [...PLAYER_INITIAL_POSITION]
      if (isMultiplayerMode && isHost !== undefined) {
        const xOffset = isHost ? -1.5 : 1.5
        spawnPos = [
          PLAYER_INITIAL_POSITION[0] + xOffset,
          PLAYER_INITIAL_POSITION[1],
          PLAYER_INITIAL_POSITION[2],
        ]
      }

      set((s) => {
        return {
          ...RESET_GAME_STATE,
          ...RESET_PLAYER_STATE,
          ...RESET_TIME_STATE,
          ...getResetInputState(),
          mode: targetMode,
          rowsData: isModeChange ? nextModeData.rowsData : s.rowsData,
          totalCounts: isModeChange ? nextModeData.totalCounts : s.totalCounts,
          overlay: nextOverlay,
          outOfBoundsEvents: [],
          // For speedrun modes, always transition to respawning to trigger spawn
          playerStatus: isAnySpeedRunMode
            ? 'respawning'
            : s.playerStatus === 'idle'
              ? 'idle'
              : 'respawning',
          spawnPosition: isAnySpeedRunMode
            ? spawnPos
            : s.playerStatus === 'idle'
              ? null
              : spawnPos,
          playerRespawnTick: s.playerRespawnTick + 1,
          playerPosition: spawnPos,
          resetPlatformTick: s.resetPlatformTick + 1,
        }
      })
    },
  })
