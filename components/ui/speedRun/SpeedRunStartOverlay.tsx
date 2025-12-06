'use client'
import gsap from 'gsap'
import { Play } from 'lucide-react'
import { type FC, type Ref, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { RingBoostInfo } from '@/components/ui/dashboard/RingsSpeedPanel'
import { Input, useUsernameInput } from '@/components/ui/input/UsernameInput'

type Props = {
  ref: Ref<HTMLDivElement>
  transitionStatus: TransitionStatus
}

// Start overlay handles the username input if needed and countdown
export const SpeedRunStartOverlay: FC<Props> = ({ ref, transitionStatus }) => {
  const setSpeedRunStage = useGameStore((s) => s.setSpeedRunStage)
  const speedRunStage = useGameStore((s) => s.speedRunStage)
  const onCountdownComplete = useGameStore((s) => s.onCountdownComplete)

  const showUsernameInput = speedRunStage === 'username'
  const showCountdown = speedRunStage === 'countdown'
  const isExiting = transitionStatus === 'exiting'
  const switchKey = `${showUsernameInput}${showCountdown}${isExiting}`

  const contentContainer = useRef<HTMLDivElement>(null)

  function animateCountdown() {
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
      .set('#countdown-go', { opacity: 0.25 })
  }

  const usernameInput = useRef<HTMLInputElement>(null)
  const inputProps = useUsernameInput()

  const startCountdown = () => {
    if (!inputProps.isValid) return
    setSpeedRunStage('countdown')
  }

  const onContentEnter = () => {
    if (showCountdown) {
      animateCountdown()
    } else {
      // focus the input
      setTimeout(() => {
        usernameInput.current?.focus()
      }, 50)
    }
  }

  const countdown = (
    <div className="relative flex items-center justify-center">
      <CountdownNumber id="countdown-3" label="3" />
      <CountdownNumber id="countdown-2" label="2" />
      <CountdownNumber id="countdown-1" label="1" />
      <CountdownNumber id="countdown-go" label="GO" />
    </div>
  )

  const usernameForm = (
    <section className="flex max-w-xl flex-col gap-6">
      <h2 className="font-unbounded text-center text-2xl font-semibold lg:text-3xl">
        Race to the finish line
      </h2>

      <Input
        ref={usernameInput}
        {...inputProps}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'NumpadEnter') {
            e.preventDefault()
            startCountdown()
          }
        }}
        endAdornment={
          <button
            type="button"
            aria-label="Start countdown"
            onClick={startCountdown}
            disabled={!inputProps.isValid}
            className={twJoin(
              'flex size-full items-center justify-center',
              inputProps.isValid
                ? 'animate-pulse text-emerald-400 hover:text-emerald-200'
                : 'text-neutral-600',
            )}>
            <Play size={32} strokeWidth={2} />
          </button>
        }
      />

      <RingBoostInfo />
    </section>
  )

  return (
    <div
      ref={ref}
      className={twJoin(
        'fixed inset-0 z-10 flex size-full flex-col items-center justify-center gap-6 bg-radial from-black/90 from-20% to-black/20 backdrop-blur-sm transition-opacity',
        transitionStatus === 'entering' && 'opacity-100 duration-300',
        transitionStatus === 'entered' && 'opacity-100',
        transitionStatus === 'exiting' && 'opacity-0 duration-500',
        transitionStatus === 'exited' && 'opacity-0',
      )}>
      <SwitchTransition>
        <Transition
          key={switchKey}
          timeout={{ enter: 0, exit: 300 }}
          nodeRef={contentContainer}
          appear={true}
          onEnter={onContentEnter}
          mountOnEnter
          unmountOnExit>
          {(status) => (
            <div
              ref={contentContainer}
              className={twJoin(
                'opacity-0 transition-opacity duration-300',
                status === 'entering' && 'opacity-100',
                status === 'entered' && 'opacity-100',
              )}>
              {showUsernameInput && usernameForm}
              {showCountdown && countdown}
            </div>
          )}
        </Transition>
      </SwitchTransition>
    </div>
  )
}

const CountdownNumber: FC<{ id: string; label: string }> = ({ id, label }) => {
  return (
    <div id={id} className="absolute text-[120px] font-black opacity-0">
      {label}
    </div>
  )
}

// background-image: radial-gradient(circle at 50% 106.013vh, rgb(255, 211, 126) 0vh, rgb(230, 64, 127) 50vh, rgb(108, 28, 101) 90vh, rgba(32, 31, 66, 0) 112.219vh); opacity: 0.655;

// mask-image: url(&quot;/VI/_next/static/media/VIstack.bc737d6e.svg&quot;); background-image: url(&quot;/VI/_next/static/media/VIstack.bc737d6e.svg&quot;); mask-size: clamp(20.0006vh, 25.0004%, 30vh); background-size: clamp(20.0006vh, 25.0004%, 30vh); -webkit-mask-position-x: 50%; background-position-x: 50%;
