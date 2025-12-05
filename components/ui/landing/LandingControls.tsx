'use client'
import { ArrowLeft, ArrowRight, Joystick, Keyboard, Volume2, VolumeX } from 'lucide-react'
import { type Dispatch, type FC, type SetStateAction } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import CTAButton from '@/components/ui/CTAButton'
import { InputType } from '@/stores/types'

import { ButtonGroup } from '../ButtonGroup'
import RotateDevice from './RotateDevice'

type Props = {
  isLoaded: boolean
  canStart: boolean
  onStartClick: () => void
  startMuted: boolean
  setStartMuted: (muted: boolean) => void
  isMobile: boolean
  isMobileLandscape: boolean
  setIsMobileLandscape: Dispatch<SetStateAction<boolean>>
}

const LandingControls: FC<Props> = ({
  isLoaded,
  canStart,
  onStartClick,
  startMuted,
  setStartMuted,
  isMobile,
  isMobileLandscape,
  setIsMobileLandscape,
}) => {
  const INPUT_TYPE_OPTIONS = [
    { label: 'Keyboard', value: InputType.KEYS, Icon: Keyboard },
    { label: 'Joystick', value: InputType.JOYSTICK, Icon: Joystick },
  ]

  const inputType = useGameStore((s) => s.inputType)
  const setInputType = useGameStore((s) => s.setInputType)
  const joystickPosition = useGameStore((s) => s.joystickPosition)
  const setJoystickPosition = useGameStore((s) => s.setJoystickPosition)

  return (
    <div
      id="landing-controls"
      className={twJoin(
        'relative flex flex-col flex-wrap items-center gap-5 transition-opacity duration-500 ease-out motion-reduce:transition-none sm:flex-row',
        isLoaded ? 'opacity-100 delay-150' : 'opacity-0',
      )}>
      <CTAButton aria-label="Start experience" disabled={!canStart} onClick={onStartClick}>
        Start experience
      </CTAButton>

      <ButtonGroup
        value={startMuted ? 'off' : 'on'}
        onChange={(val) => setStartMuted(val === 'off')}
        items={[
          { label: null, value: 'on', Icon: Volume2 },
          { label: null, value: 'off', Icon: VolumeX },
        ]}
      />

      <ButtonGroup
        value={inputType}
        onChange={setInputType}
        items={INPUT_TYPE_OPTIONS.map(({ value, Icon, label }) => ({
          value,
          Icon,
          label: null,
          ariaLabel: label,
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

      <RotateDevice
        isMobile={isMobile}
        isLandscape={isMobileLandscape}
        setIsLandscape={setIsMobileLandscape}
      />
    </div>
  )
}

export default LandingControls
