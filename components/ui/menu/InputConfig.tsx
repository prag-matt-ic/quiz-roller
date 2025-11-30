import { Joystick, Keyboard } from 'lucide-react'
import { type FC } from 'react'

import { useGameStore } from '@/components/GameProvider'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { InputType } from '@/stores/types'

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
        items={[
          {
            label: 'Keyboard',
            value: InputType.KEYS,
            Icon: Keyboard,
          },
          {
            label: 'Joystick',
            value: InputType.JOYSTICK,
            Icon: Joystick,
          },
        ]}
      />

      {inputType === InputType.JOYSTICK && (
        <ButtonGroup
          value={joystickPosition}
          onChange={setJoystickPosition}
          items={[
            { label: 'Left Handed', value: 'left' },
            { label: 'Right Handed', value: 'right' },
          ]}
        />
      )}
    </>
  )
}
