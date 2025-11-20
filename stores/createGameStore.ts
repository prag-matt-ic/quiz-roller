import { createStore } from 'zustand'
import { persist, subscribeWithSelector, type PersistOptions } from 'zustand/middleware'
import { type PlaySoundFX, type SoundFX } from '@/components/SoundProvider'
import { GameStore } from './types'
import { createTimeSlice } from './timeSlice'
import { createPlayerSlice } from './playerSlice'
import { createGameSlice } from './gameSlice'
import type { SpeedRunDatabase, SpeedRunSubmission } from '@/model/schema'

export const createGameStore = (
  playSoundFX: PlaySoundFX,
  stopSoundFX: (fx: SoundFX) => void,
  submitSpeedRun: (data: SpeedRunSubmission) => Promise<SpeedRunDatabase | null>,
) => {
  return createStore<GameStore>()(
    subscribeWithSelector(
      persist<GameStore, [], [], Pick<GameStore, 'username' | 'paletteIndex' | 'totalTimeS'>>(
        (...a) => ({
          ...createTimeSlice(submitSpeedRun)(...a),
          ...createPlayerSlice({ playSoundFX, stopSoundFX })(...a),
          ...createGameSlice(...a),
        }),
        {
          name: 'quizroller-page',
          partialize: (s) => ({
            username: s.username,
            paletteIndex: s.paletteIndex,
            totalTimeS: s.totalTimeS,
          }),
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
        } as PersistOptions<
          GameStore,
          Pick<GameStore, 'username' | 'paletteIndex' | 'totalTimeS'>
        >,
      ),
    ),
  )
}
