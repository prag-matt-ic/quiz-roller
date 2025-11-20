import type { GameSliceCreator, TimeSlice } from './types'
import { SpeedRunSubmission } from '@/model/schema'

export const INITIAL_TIME_STATE = {
  totalTimeS: 0,
  speedRunTimeCS: 0,
  isSpeedRunTiming: false,
  isSpeedRunMode: false,
  completedSpeedRuns: [],
}

export const createTimeSlice =
  (submitSpeedRun: (data: SpeedRunSubmission) => void): GameSliceCreator<TimeSlice> =>
  (set, get) => ({
    ...INITIAL_TIME_STATE,
    setTotalTimeS: (seconds: number) => {
      set({ totalTimeS: seconds })
    },
    setSpeedRunTimeCS: (centiSeconds: number) => {
      set({ speedRunTimeCS: centiSeconds })
    },
    setIsSpeedRunTiming: (isTiming) => {
      set({ isSpeedRunTiming: isTiming })
    },
    startSpeedRun: () => {
      if (get().isSpeedRunMode) return
      get().resetGame()
      set({
        isSpeedRunMode: true,
        speedRunTimeCS: 0,
        isSpeedRunTiming: false,
      })
    },
    stopSpeedRun: () => {
      if (!get().isSpeedRunMode) return
      set({ isSpeedRunMode: false, isSpeedRunTiming: false })
      get().resetGame()
    },
    restartSpeedRun: () => {
      if (!get().isSpeedRunMode) {
        get().startSpeedRun()
        return
      }
      get().resetGame()
      set({
        isSpeedRunMode: true,
        speedRunTimeCS: 0,
        isSpeedRunTiming: false,
      })
    },
    finishSpeedRun: () => {
      const { speedRunTimeCS, username, completedSpeedRuns } = get()
      if (!username) return

      const timeInSeconds = Math.round(speedRunTimeCS) / 100

      const submission: SpeedRunSubmission = {
        username,
        time: timeInSeconds,
        attempt: completedSpeedRuns.length + 1,
        date: new Date().toISOString(),
      }

      submitSpeedRun(submission)

      set((state) => ({
        completedSpeedRuns: [
          ...state.completedSpeedRuns,
          { speedRunTimeCS, date: submission.date },
        ],
        isSpeedRunTiming: false,
      }))
    },
  })
