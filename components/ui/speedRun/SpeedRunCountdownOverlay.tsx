'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, type Ref } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { SoundFX, useSoundStore } from '@/components/SoundProvider'

type Props = {
  ref: Ref<HTMLDivElement>
  transitionStatus: TransitionStatus
}

// Start overlay handles the username input if needed and countdown
export const SpeedRunCountdownOverlay: FC<Props> = ({ ref, transitionStatus }) => {
  const onCountdownComplete = useGameStore((s) => s.onCountdownComplete)
  const playSoundFX = useSoundStore((s) => s.playSoundFX)

  useGSAP(() => {
    if (transitionStatus !== 'entered') return

    playSoundFX(SoundFX.COUNTDOWN)

    gsap
      .timeline({
        defaults: { ease: 'linear' },
        onComplete: () => {
          onCountdownComplete()
        },
      })
      .set('#countdown-3', { opacity: 1 })
      .to('#countdown-3', {
        opacity: 0,
        duration: 1.0,
      })
      .set('#countdown-2', { opacity: 1 })
      .to('#countdown-2', {
        opacity: 0,
        duration: 1.0,
      })
      .set('#countdown-1', { opacity: 1 })
      .to('#countdown-1', {
        opacity: 0,
        duration: 1.0,
      })
      .set('#countdown-go', { opacity: 1 })
  }, [transitionStatus, playSoundFX])

  return (
    <div
      ref={ref}
      className={twJoin(
        'fixed inset-0 z-10 flex size-full flex-col items-center justify-center gap-6 bg-black/50 transition-opacity',
        transitionStatus === 'entering' && 'opacity-100 duration-300',
        transitionStatus === 'entered' && 'opacity-100',
        transitionStatus === 'exiting' && 'opacity-0 duration-300',
        transitionStatus === 'exited' && 'opacity-0',
      )}>
      <div className="relative flex items-center justify-center">
        <CountdownNumber id="countdown-3" label="3" />
        <CountdownNumber id="countdown-2" label="2" />
        <CountdownNumber id="countdown-1" label="1" />
        <CountdownNumber id="countdown-go" label="GO" />
      </div>
    </div>
  )
}

const CountdownNumber: FC<{ id: string; label: string }> = ({ id, label }) => {
  return (
    <div id={id} className="absolute text-[120px] font-black opacity-0 xl:text-[140px]">
      {label}
    </div>
  )
}
