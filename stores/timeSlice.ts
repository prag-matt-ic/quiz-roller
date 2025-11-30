import type { InsertSpeedRunResponse, ServerSpeedRunSubmission } from '@/model/schema'

import { GameMode, type GameSliceCreator, type SpeedRunStage, type TimeSlice } from './types'

export const RESET_TIME_STATE: Pick<TimeSlice, 'speedRunTimeCS' | 'speedRunStage'> = {
  speedRunTimeCS: 0,
  speedRunStage: 'username',
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
    setSpeedRunStage: (stage: SpeedRunStage) => {
      set({ speedRunStage: stage })
    },
    startSpeedRun: () => {
      const { username, resetGame } = get()
      resetGame({
        mode: GameMode.SPEEDRUN,
        speedRunStage: !!username ? 'countdown' : 'username',
      })
    },
    onCountdownComplete: () => {
      set({
        speedRunStage: 'running',
      })
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
