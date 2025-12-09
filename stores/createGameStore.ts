import { createStore } from 'zustand'
import { type PersistOptions, persist, subscribeWithSelector } from 'zustand/middleware'

import { type PlaySoundFX, type SoundFX } from '@/components/SoundProvider'
import type { InsertSpeedRunResponse, ServerSpeedRunSubmission } from '@/model/schema'

import { createGameSlice } from './gameSlice'
import { createInputSlice } from './inputSlice'
import { createOverlaysSlice } from './overlaysSlice'
import { createPlayerSlice } from './playerSlice'
import { createTimeSlice } from './timeSlice'
import { GameMode, type GameStore } from './types'

type PersistedStore = Pick<
  GameStore,
  'username' | 'totalTimeS' | 'completedSpeedRuns' | 'mode' | 'inputType' | 'joystickPosition'
>

export const createGameStore = ({
  isMobile,
  playSoundFX,
  stopSoundFX,
  insertSpeedRun,
}: {
  isMobile: boolean
  playSoundFX: PlaySoundFX
  stopSoundFX: (fx: SoundFX) => void
  insertSpeedRun: (data: ServerSpeedRunSubmission) => InsertSpeedRunResponse
}) => {
  return createStore<GameStore>()(
    subscribeWithSelector(
      persist<GameStore, [], [], PersistedStore>(
        (...a) => ({
          ...createTimeSlice(insertSpeedRun)(...a),
          ...createInputSlice({ isMobile, playSoundFX, stopSoundFX })(...a),
          ...createPlayerSlice({ isMobile, playSoundFX, stopSoundFX })(...a),
          ...createOverlaysSlice(...a),
          ...createGameSlice(...a),
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
                console.error('an error happened during hydration', error)
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
