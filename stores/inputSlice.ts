import { type GameSliceCreator, type InputSlice, InputType, type SliceDeps } from './types'

export const getResetInputState = (): Pick<InputSlice, 'playerInput'> => ({
  playerInput: {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
  },
})

export const createInputSlice =
  ({ isMobile }: SliceDeps): GameSliceCreator<InputSlice> =>
  (set) => {
    const initialInputType: InputType = isMobile ? InputType.JOYSTICK : InputType.KEYS
    return {
      ...getResetInputState(),
      inputType: initialInputType,
      joystickPosition: 'right',
      setInputType: (type: InputType) => {
        set({ inputType: type })
      },
      setJoystickPosition: (position) => {
        set({ joystickPosition: position })
      },
      setPlayerInput(input) {
        set({ playerInput: input })
      },
    }
  }
