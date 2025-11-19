import { GameSliceCreator, TimeSlice } from './types'

export const INITIAL_TIME_STATE = {
  totalTimeSeconds: 0,
  speedRunTimeSeconds: 0,
  isSpeedRunTiming: false,
  isSpeedRunMode: false,
}

export const createTimeSlice: GameSliceCreator<TimeSlice> = (set, get) => ({
  ...INITIAL_TIME_STATE,
  setTotalTimeSeconds: (seconds: number) => {
    set({ totalTimeSeconds: seconds })
  },
  setSpeedRunTimeSeconds: (seconds: number) => {
    set({ speedRunTimeSeconds: seconds })
  },
  setIsSpeedRunTiming: (isTiming) => {
    set({ isSpeedRunTiming: isTiming })
  },
  startSpeedRun: () => {
    if (get().isSpeedRunMode) return
    get().resetGame()
    set({
      isSpeedRunMode: true,
      speedRunTimeSeconds: 0,
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
      speedRunTimeSeconds: 0,
      isSpeedRunTiming: false,
    })
  },
})
