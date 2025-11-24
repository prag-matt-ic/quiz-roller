import type { GameSliceCreator, SpeedRunStage, TimeSlice } from './types'
import type { ServerSpeedRunSubmission, InsertSpeedRunResponse } from '@/model/schema'

export const INITIAL_TIME_STATE: Pick<
  TimeSlice,
  'totalTimeS' | 'speedRunTimeCS' | 'isSpeedRunMode' | 'completedSpeedRuns' | 'speedRunStage'
> = {
  totalTimeS: 0,
  speedRunTimeCS: 0,
  isSpeedRunMode: false,
  completedSpeedRuns: [],
  speedRunStage: 'username',
}

export const createTimeSlice =
  (
    insertSpeedRun: (data: ServerSpeedRunSubmission) => InsertSpeedRunResponse,
  ): GameSliceCreator<TimeSlice> =>
  (set, get) => ({
    ...INITIAL_TIME_STATE,
    setTotalTimeS: (seconds: number) => {
      set({ totalTimeS: seconds })
    },
    setSpeedRunTimeCS: (centiSeconds: number) => {
      set({ speedRunTimeCS: centiSeconds })
    },
    setSpeedRunStage: (stage: SpeedRunStage) => {
      set({ speedRunStage: stage })
    },
    startSpeedRun: () => {
      const { username, resetGame } = get()
      resetGame({ isSpeedRunMode: true, speedRunStage: !!username ? 'countdown' : 'username' })
    },
    onCountdownComplete: () => {
      set({
        speedRunStage: 'running',
      })
    },
    stopSpeedRun: () => {
      if (!get().isSpeedRunMode) return
      get().resetGame({ isSpeedRunMode: false })
    },
    finishSpeedRun: async () => {
      const { speedRunTimeCS, username } = get()
      if (!username) return

      set({ speedRunStage: 'submitting' })

      const timeInSeconds = Math.round(speedRunTimeCS) / 100
      const submission: ServerSpeedRunSubmission = {
        username,
        time: timeInSeconds,
        date: new Date().toISOString(),
      }

      try {
        const result = await insertSpeedRun(submission)
        if (!result) throw new Error('Inserting speedrun returned null')
        set((state) => ({
          completedSpeedRuns: [...state.completedSpeedRuns, result],
          speedRunStage: 'leaderboard',
        }))
      } catch (error) {
        // TODO: handle showing the error with some UI - maybe a toast?
        console.error('Error inserting speedrun:', error)
        set({ speedRunStage: 'leaderboard' })
      }
    },
  })
