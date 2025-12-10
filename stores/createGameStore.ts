import { createStore } from 'zustand'
import { type PersistOptions, persist, subscribeWithSelector } from 'zustand/middleware'

import type { SpeedRunDatabase } from '@/model/schema'
import { PLATFORM_VERSION } from '@/resources/rowsData'

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
          version: 3,
          migrate: (persistedState: any) => {
            if (!persistedState) return persistedState

            const currentVersion = PLATFORM_VERSION
            const persistedRuns = persistedState?.completedSpeedRuns
            const runsByVersion: Record<string, unknown> =
              persistedRuns && typeof persistedRuns === 'object' ? persistedRuns : {}

            if (Array.isArray(persistedRuns)) {
              for (const run of persistedRuns) {
                if (!run) continue
                const versionKey = (run as { level_id?: string })?.level_id ?? currentVersion
                const existing = (runsByVersion[versionKey] as unknown[]) ?? []
                runsByVersion[versionKey] = [...existing, run]
              }
            }

            const completedSpeedRuns = Object.entries(runsByVersion).reduce<
              Record<string, SpeedRunDatabase[]>
            >((acc, [version, runs]) => {
              if (Array.isArray(runs)) acc[version] = runs as SpeedRunDatabase[]
              return acc
            }, {})

            if (!completedSpeedRuns[currentVersion]) {
              completedSpeedRuns[currentVersion] = []
            }

            return {
              ...persistedState,
              completedSpeedRuns,
              platformVersion: currentVersion,
            }
          },
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
