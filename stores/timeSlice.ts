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
    completedSpeedRuns: [],
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
    onCountdownComplete: () => {
      const speedRunStage = SpeedRunStage.RUNNING
      set({
        speedRunStage,
        overlay: getOverlayForSpeedRunStage(speedRunStage),
      })
    },
    finishSpeedRun: async () => {
      const { speedRunTimeCS, username, inputType } = get()
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
        level_id: PLATFORM_VERSION,
      }

      try {
        const result = await insertSpeedRun(submission)
        if (!result) throw new Error('Inserting speedrun returned null')
        set((state) => {
          const speedRunStage = SpeedRunStage.END
          return {
            completedSpeedRuns: [...state.completedSpeedRuns, result],
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
