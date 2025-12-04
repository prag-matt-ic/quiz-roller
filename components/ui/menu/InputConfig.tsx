import { ArrowLeft, ArrowRight, Joystick, Keyboard } from 'lucide-react'
import { type FC } from 'react'

import { useGameStore } from '@/components/GameProvider'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { InputType } from '@/stores/types'

const INPUT_TYPE_OPTIONS = [
  { label: 'Keyboard', value: InputType.KEYS, Icon: Keyboard },
  { label: 'Joystick', value: InputType.JOYSTICK, Icon: Joystick },
]

export const InputConfig: FC = () => {
  const inputType = useGameStore((s) => s.inputType)
  const setInputType = useGameStore((s) => s.setInputType)
  const joystickPosition = useGameStore((s) => s.joystickPosition)
  const setJoystickPosition = useGameStore((s) => s.setJoystickPosition)

  return (
    <>
      <ButtonGroup
        value={inputType}
        onChange={setInputType}
        items={INPUT_TYPE_OPTIONS.map(({ value, Icon, label }) => ({
          value,
          Icon,
          label: null,
          ariaLabel: label ?? undefined,
        }))}
      />

      {inputType === InputType.JOYSTICK && (
        <ButtonGroup
          value={joystickPosition}
          onChange={setJoystickPosition}
          items={[
            { label: 'Left', value: 'left', Icon: ArrowLeft },
            { label: 'Right', value: 'right', Icon: ArrowRight },
          ]}
        />
      )}
    </>
  )
}
