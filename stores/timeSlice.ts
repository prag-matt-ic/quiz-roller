import type { InsertSpeedRunResponse, ServerSpeedRunSubmission } from '@/model/schema'

import {
  GameMode,
  type GameSliceCreator,
  InputType,
  type SpeedRunStage,
  type TimeSlice,
} from './types'
import { getSpeedRunOverlays } from './overlaysSlice'

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
      const { mode } = get()
      const isSpeedRunMode = mode === GameMode.SPEEDRUN
      const overlays = getSpeedRunOverlays(stage, isSpeedRunMode)
      set({
        speedRunStage: stage,
        ...overlays,
      })
    },
    startSpeedRun: () => {
      const { username, resetGame } = get()
      resetGame({
        mode: GameMode.SPEEDRUN,
        speedRunStage: !!username ? 'countdown' : 'username',
      })
    },
    onCountdownComplete: () => {
      const { mode } = get()
      const isSpeedRunMode = mode === GameMode.SPEEDRUN
      const stage = 'running'
      const overlays = getSpeedRunOverlays(stage, isSpeedRunMode)
      set({
        speedRunStage: stage,
        ...overlays,
      })
    },
    finishSpeedRun: async () => {
      const { speedRunTimeCS, username, inputType, mode } = get()
      if (!username) return

      const isSpeedRunMode = mode === GameMode.SPEEDRUN
      const submittingStage = 'submitting'
      const submittingOverlays = getSpeedRunOverlays(submittingStage, isSpeedRunMode)

      set({
        speedRunStage: submittingStage,
        ...submittingOverlays,
      })

      const timeInSeconds = Math.round(speedRunTimeCS) / 100

      const submission: ServerSpeedRunSubmission = {
        username,
        time: timeInSeconds,
        date: new Date().toISOString(),
        input_type: inputType === InputType.KEYS ? 'keyboard' : 'joystick',
        level_id: '1.0',
      }

      try {
        const result = await insertSpeedRun(submission)
        if (!result) throw new Error('Inserting speedrun returned null')
        set((state) => {
          const stage = 'leaderboard'
          const isSpeedRunMode = state.mode === GameMode.SPEEDRUN
          const overlays = getSpeedRunOverlays(stage, isSpeedRunMode)
          return {
            completedSpeedRuns: [...state.completedSpeedRuns, result],
            speedRunStage: stage,
            ...overlays,
          }
        })
      } catch (error) {
        // TODO: handle showing the error with some UI - maybe a toast?
        console.error('Error inserting speedrun:', error)
        set((state) => {
          const stage = 'leaderboard'
          const isSpeedRunMode = state.mode === GameMode.SPEEDRUN
          const overlays = getSpeedRunOverlays(stage, isSpeedRunMode)
          return {
            speedRunStage: stage,
            ...overlays,
          }
        })
      }
    },
  })
