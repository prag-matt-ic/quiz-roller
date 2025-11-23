import { createStore } from 'zustand'
import { persist, subscribeWithSelector, type PersistOptions } from 'zustand/middleware'
import { type PlaySoundFX, type SoundFX } from '@/components/SoundProvider'
import { GameStore } from './types'
import { createTimeSlice } from './timeSlice'
import { createPlayerSlice } from './playerSlice'
import { createGameSlice } from './gameSlice'
import type { SpeedRunSubmission, InsertSpeedRunResponse } from '@/model/schema'

type PersistedStore = Pick<
  GameStore,
  'username' | 'paletteIndex' | 'totalTimeS' | 'completedSpeedRuns'
>

export const createGameStore = (
  playSoundFX: PlaySoundFX,
  stopSoundFX: (fx: SoundFX) => void,
  insertSpeedRun: (data: SpeedRunSubmission) => InsertSpeedRunResponse,
) => {
  return createStore<GameStore>()(
    subscribeWithSelector(
      persist<GameStore, [], [], PersistedStore>(
        (...a) => ({
          ...createTimeSlice(insertSpeedRun)(...a),
          ...createPlayerSlice({ playSoundFX, stopSoundFX })(...a),
          ...createGameSlice(...a),
        }),
        {
          name: 'quizroller-page',
          partialize: (s) =>
            ({
              username: s.username,
              paletteIndex: s.paletteIndex,
              totalTimeS: s.totalTimeS,
              completedSpeedRuns: s.completedSpeedRuns,
            }) as PersistedStore,
          version: 1,
          onRehydrateStorage: (state) => {
            return (state, error) => {
              if (!!error) {
                console.error('an error happened during hydration', error)
              } else {
                state?.setHydrated()
              }
            }
          },
        } as PersistOptions<GameStore, PersistedStore>,
      ),
    ),
  )
}
