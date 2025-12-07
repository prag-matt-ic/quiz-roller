'use client'
import {
  ArrowLeft,
  ArrowRight,
  Joystick,
  Keyboard,
  RotateCcwIcon,
  Volume2,
  VolumeX,
} from 'lucide-react'
import {
  type Dispatch,
  type FC,
  ReactNode,
  type SetStateAction,
  useEffect,
  useState,
} from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { useSoundStore } from '@/components/SoundProvider'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import CTAButton from '@/components/ui/CTAButton'
import { InputType } from '@/stores/types'

import Button from '../Button'
import { PointerProvider } from '../PointerProvider'
import Panel from '../panel/Panel'

type Props = {
  isLoaded: boolean
  isMobile: boolean
  onStart: () => void
}

const LandingControls: FC<Props> = ({ isLoaded, isMobile, onStart }) => {
  const INPUT_TYPE_OPTIONS = [
    { label: 'Keyboard', value: InputType.KEYS, Icon: Keyboard },
    { label: 'Joystick', value: InputType.JOYSTICK, Icon: Joystick },
  ]

  const setIsMuted = useSoundStore((s) => s.setIsMuted)
  const inputType = useGameStore((s) => s.inputType)
  const setInputType = useGameStore((s) => s.setInputType)
  const joystickPosition = useGameStore((s) => s.joystickPosition)
  const setJoystickPosition = useGameStore((s) => s.setJoystickPosition)

  const [startMuted, setStartMuted] = useState(false)
  const [isMobileLandscape, setIsMobileLandscape] = useState(!isMobile)

  const canStart = isLoaded && (!isMobile || isMobileLandscape)

  useDeviceOrientation({ isMobile, setIsLandscape: setIsMobileLandscape })

  const onStartClick = () => {
    setIsMuted(startMuted)
    onStart()
  }

  const ctaLabel: ReactNode = !isMobile ? (
    'Start experience'
  ) : isMobileLandscape ? (
    'Start experience'
  ) : (
    <>
      Rotate to start <RotateCcwIcon />
    </>
  )

  return (
    <PointerProvider isMobile={isMobile}>
      <Panel
        className={twJoin(
          'relative mx-auto flex w-fit flex-wrap items-center justify-center gap-4 self-start transition-opacity duration-500 ease-out motion-reduce:transition-none',
          isLoaded ? 'opacity-100 delay-200' : 'opacity-0',
        )}>
        {/* <CTAButton aria-label="Start experience" disabled={!canStart} onClick={onStartClick}>
          {ctaLabel}
        </CTAButton> */}

        <Button aria-label="Start experience" disabled={!canStart} onClick={onStartClick}>
          {ctaLabel}
        </Button>

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
      </Panel>
    </PointerProvider>
  )
}

export default LandingControls

function useDeviceOrientation({
  isMobile,
  setIsLandscape,
}: {
  isMobile: boolean
  setIsLandscape: Dispatch<SetStateAction<boolean>>
}) {
  useEffect(() => {
    if (!isMobile) return

    const mediaQuery = window.matchMedia('(orientation: landscape)')

    const onOrientationChange = (event: MediaQueryList | MediaQueryListEvent) => {
      setIsLandscape(event.matches)
    }

    onOrientationChange(mediaQuery)

    mediaQuery.addEventListener('change', onOrientationChange)
    return () => {
      mediaQuery.removeEventListener('change', onOrientationChange)
    }
  }, [isMobile, setIsLandscape])
}
