import { createStore } from 'zustand'
import { type PersistOptions, persist, subscribeWithSelector } from 'zustand/middleware'

import { createGameSlice } from './gameSlice'
import { createInputSlice } from './inputSlice'
import { createMultiplayerSlice } from './multiplayerSlice'
import { createOverlaysSlice } from './overlaysSlice'
import { createPlayerSlice } from './playerSlice'
import { createTimeSlice } from './timeSlice'
import { type CreateGameStoreParams, GameMode, type GameStore } from './types'

type PersistedStore = Pick<
  GameStore,
  | 'username'
  | 'totalTimeS'
  | 'completedSpeedRuns'
  | 'mode'
  | 'inputType'
  | 'joystickPosition'
  | 'paletteIndex'
  | 'isSubscribed'
>

export const createGameStore = (params: CreateGameStoreParams) => {
  return createStore<GameStore>()(
    subscribeWithSelector(
      persist<GameStore, [], [], PersistedStore>(
        (...a) => ({
          ...createTimeSlice(params.insertSpeedRun)(...a),
          ...createInputSlice(params.isMobile)(...a),
          ...createPlayerSlice(params)(...a),
          ...createOverlaysSlice(...a),
          ...createMultiplayerSlice(...a),
          ...createGameSlice(params.switchBackgroundTrack)(...a),
        }),
        {
          name: 'speedroller-game',
          partialize: (s) =>
            ({
              username: s.username,
              isSubscribed: s.isSubscribed,
              totalTimeS: s.totalTimeS,
              completedSpeedRuns: s.completedSpeedRuns,
              mode: s.mode,
              inputType: s.inputType,
              joystickPosition: s.joystickPosition,
              paletteIndex: s.paletteIndex,
            }) as PersistedStore,
          version: 1,
          onRehydrateStorage: () => {
            return (state, error) => {
              if (!!error) {
                console.error('Error during game store hydration:', error)
              } else {
                state?.setHydrated(state?.mode ?? GameMode.LEARN)
              }
            }
          },
        } as PersistOptions<GameStore, PersistedStore>,
      ),
    ),
  )
}
