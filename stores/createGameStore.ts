import { createStore } from 'zustand'
import { persist, subscribeWithSelector, type PersistOptions } from 'zustand/middleware'
import { type PlaySoundFX, type SoundFX } from '@/components/SoundProvider'
import { GameStore } from './types'
import { createTimeSlice } from './timeSlice'
import { createPlayerSlice } from './playerSlice'
import { createGameSlice } from './gameSlice'

export const createGameStore = (
  playSoundFX: PlaySoundFX,
  stopSoundFX: (fx: SoundFX) => void,
) => {
  return createStore<GameStore>()(
    subscribeWithSelector(
      persist(
        (...a) => ({
          ...createTimeSlice(...a),
          ...createPlayerSlice({ playSoundFX, stopSoundFX })(...a),
          ...createGameSlice(...a),
        }),
        {
          name: 'quizroller-page',
          partialize: (s) => ({
            paletteIndex: s.paletteIndex,
            totalTimeSeconds: s.totalTimeSeconds,
          }),
          version: 1,
        } as PersistOptions<GameStore, Pick<GameStore, 'paletteIndex' | 'totalTimeSeconds'>>,
      ),
    ),
  )
}
