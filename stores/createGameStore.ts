import { createStore } from 'zustand'
import { type PersistOptions, persist, subscribeWithSelector } from 'zustand/middleware'

import { createGameSlice } from './gameSlice'
import { createInputSlice } from './inputSlice'
import { createOverlaysSlice } from './overlaysSlice'
import { createPlayerSlice } from './playerSlice'
import { createTimeSlice } from './timeSlice'
import { type CreateGameStoreParams, GameMode, type GameStore } from './types'

type PersistedStore = Pick<
  GameStore,
  'username' | 'totalTimeS' | 'completedSpeedRuns' | 'mode' | 'inputType' | 'joystickPosition'
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
          ...createGameSlice(params.switchBackgroundTrack)(...a),
        }),
        {
          name: 'quizroller-v2',
          partialize: (s) =>
            ({
              username: s.username,
              totalTimeS: s.totalTimeS,
              completedSpeedRuns: s.completedSpeedRuns,
              mode: s.mode,
              inputType: s.inputType,
              joystickPosition: s.joystickPosition,
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
