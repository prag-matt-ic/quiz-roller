import {
  type CreateGameStoreParams,
  type GameSliceCreator,
  type InputSlice,
  InputType,
  type LeaderboardFilter,
  type PlayerInput,
} from './types'

const createZeroInput = (): PlayerInput => ({
  up: 0,
  down: 0,
  left: 0,
  right: 0,
})

export const getResetInputState = (): Pick<
  InputSlice,
  'playerInput' | 'playerInputIntent'
> => ({
  playerInput: createZeroInput(),
  playerInputIntent: createZeroInput(),
})

export const createInputSlice =
  (isMobile: CreateGameStoreParams['isMobile']): GameSliceCreator<InputSlice> =>
  (set) => {
    const initialInputType: InputType = isMobile ? InputType.JOYSTICK : InputType.KEYS
    return {
      ...getResetInputState(),
      isMobile,
      inputType: initialInputType,
      joystickPosition: 'right',
      leaderboardFilter: initialInputType,
      setInputType: (type: InputType) => {
        set({ inputType: type })
      },
      setJoystickPosition: (position) => {
        set({ joystickPosition: position })
      },
      setPlayerInputIntent(input) {
        set({ playerInputIntent: input })
      },
      setPlayerInput(input) {
        set({ playerInput: input })
      },
      setLeaderboardFilter: (filter: LeaderboardFilter) => {
        set({ leaderboardFilter: filter })
      },
    }
  }
