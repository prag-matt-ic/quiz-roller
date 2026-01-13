import type { InsertSpeedRunResponse, ServerSpeedRunSubmission } from '@/model/schema'
import { PLATFORM_VERSION } from '@/resources/rowsData'

import {
  GameMode,
  type GameSliceCreator,
  SpeedRunStage,
  type TimeSlice,
  getOverlayForSpeedRunStage,
} from './types'

export const RESET_TIME_STATE: Pick<TimeSlice, 'speedRunTimeCS' | 'speedRunStage'> = {
  speedRunTimeCS: 0,
  speedRunStage: SpeedRunStage.START,
}

export const createTimeSlice =
  (
    insertSpeedRun: (data: ServerSpeedRunSubmission) => InsertSpeedRunResponse,
  ): GameSliceCreator<TimeSlice> =>
  (set, get) => ({
    ...RESET_TIME_STATE,
    totalTimeS: 0,
    completedSpeedRuns: {},
    platformVersion: PLATFORM_VERSION,
    setTotalTimeS: (seconds: number) => {
      set({ totalTimeS: seconds })
    },
    setSpeedRunTimeCS: (centiSeconds: number) => {
      set({ speedRunTimeCS: centiSeconds })
    },
    startCountdown: () => {
      get().resetGame({
        mode: GameMode.SPEEDRUN,
        speedRunStage: SpeedRunStage.COUNTDOWN,
      })
    },
    startMultiplayerCountdown: (isHost: boolean) => {
      get().resetGame({
        mode: GameMode.SPEEDRUN_MULTIPLAYER,
        speedRunStage: SpeedRunStage.COUNTDOWN,
        isHost,
      })
    },
    onCountdownComplete: () => {
      const speedRunStage = SpeedRunStage.RUNNING
      set({
        speedRunStage,
        overlay: getOverlayForSpeedRunStage(speedRunStage),
      })
    },
    finishSpeedRun: async () => {
      const {
        mode,
        speedRunTimeCS,
        username,
        inputType,
        platformVersion,
        outOfBoundsEvents,
        collectedRings,
        onLocalPlayerFinished,
      } = get()

      // For multiplayer, just record the finish and let the multiplayer slice handle the rest
      if (mode === GameMode.SPEEDRUN_MULTIPLAYER) {
        onLocalPlayerFinished(speedRunTimeCS)
        return
      }

      // Single-player speed run logic
      if (!username) return
      const speedRunStage = SpeedRunStage.SUBMITTING

      set({
        speedRunStage,
        overlay: getOverlayForSpeedRunStage(speedRunStage),
      })

      const timeInSeconds = Math.round(speedRunTimeCS) / 100

      const submission: ServerSpeedRunSubmission = {
        username,
        time: timeInSeconds,
        date: new Date().toISOString(),
        input_type: inputType,
        level_id: platformVersion,
        accidents: outOfBoundsEvents.length,
        rings: Object.keys(collectedRings).length,
      }

      try {
        const result = await insertSpeedRun(submission)
        if (!result) throw new Error('Inserting speedrun returned null')
        set((state) => {
          const speedRunStage = SpeedRunStage.END
          const versionKey = platformVersion
          const existingRuns = state.completedSpeedRuns[versionKey] ?? []
          const runWithVersion = {
            ...result,
            level_id: result.level_id ?? versionKey,
          }
          return {
            completedSpeedRuns: {
              ...state.completedSpeedRuns,
              [versionKey]: [...existingRuns, runWithVersion],
            },
            speedRunStage: speedRunStage,
            overlay: getOverlayForSpeedRunStage(speedRunStage),
          }
        })
      } catch (error) {
        // TODO: handle showing the error with some UI - maybe a toast?
        console.error('Error inserting speedrun:', error)
        set({
          speedRunStage: SpeedRunStage.END,
          overlay: getOverlayForSpeedRunStage(SpeedRunStage.END),
        })
      }
    },
  })
