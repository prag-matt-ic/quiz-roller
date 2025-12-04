import { ArrowLeft, ArrowRight, Joystick, Keyboard } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
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
      <div className="relative flex items-center justify-center gap-8 rounded-xl px-4 py-3 text-white">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-xl border border-white/30"
        />
        {INPUT_TYPE_OPTIONS.map(({ value, Icon, label }) => {
          const isActive = inputType === value
          return (
            <Button
              key={value}
              type="button"
              aria-pressed={isActive}
              variant="secondary"
              color="light"
              size="md"
              startIcon={Icon}
              onClick={() => setInputType(value)}
              iconClassName={twMerge('size-7', isActive ? 'text-white' : 'text-white/60')}
              className={twMerge(
                'rounded-xl bg-transparent px-3 py-2 normal-case shadow-none',
                'hover:bg-white/10 hover:text-white',
                isActive
                  ? 'bg-white/15 text-white ring-1 ring-white/30 ring-inset'
                  : 'text-white/70',
              )}>
              <span className="sr-only">{label}</span>
            </Button>
          )
        })}
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
      </div>
    </>
  )
}
