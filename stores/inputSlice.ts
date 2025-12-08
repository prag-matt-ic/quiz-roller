import {
  type GameSliceCreator,
  type InputSlice,
  InputType,
  type PlayerInput,
  type SliceDeps,
} from './types'

const createZeroInput = (): PlayerInput => ({
  up: 0,
  down: 0,
  left: 0,
  right: 0,
})

export const getResetInputState = (): Pick<InputSlice, 'playerInput' | 'playerInputIntent'> => ({
  playerInput: createZeroInput(),
  playerInputIntent: createZeroInput(),
})

export const createInputSlice =
  ({ isMobile }: SliceDeps): GameSliceCreator<InputSlice> =>
  (set) => {
    const initialInputType: InputType = isMobile ? InputType.JOYSTICK : InputType.KEYS
    return {
      ...getResetInputState(),
      isMobile,
      inputType: initialInputType,
      joystickPosition: 'right',
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
    }
  }
