'use client'
import gsap from 'gsap'
import { ArrowRight, RotateCcw, X } from 'lucide-react'
import { type FC, type Ref, useRef, useState } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { Input } from '@/components/ui/input'
import { SpeedRunTimeDisplay } from '@/components/ui/SpeedRunTimeDisplay'
import { GameMode } from '@/stores/types'

const SpeedRunTimer: FC = () => {
  const speedRunStatus = useGameStore((s) => s.speedRunStage)

  const isFinished = speedRunStatus === 'submitting' || speedRunStatus === 'leaderboard'
  if (isFinished) return null

  const isAmber = speedRunStatus === 'countdown' || speedRunStatus === 'username'
  return (
    <div className="flex flex-col items-center gap-1.5 overflow-hidden">
      <div className="flex items-center gap-2">
        <div
          className={twJoin('size-2 rounded-full', isAmber ? 'bg-amber-400' : 'bg-green-500')}
        />
        <h2 className="text-xs tracking-wider text-white/60 uppercase">Speedroll</h2>
      </div>
      <SpeedRunTimeDisplay className="font-mono text-2xl leading-none font-semibold tracking-tight lg:text-4xl" />
    </div>
  )
}

export const SpeedRunControls: FC = () => {
  const speedRunStatus = useGameStore((s) => s.speedRunStage)
  const showSpeedRunButtons = speedRunStatus === 'running'

  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <div className="pointer-events-auto flex size-fit items-center justify-center gap-3">
      {showSpeedRunButtons && (
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded bg-amber-700 text-white transition hover:bg-red-500/70"
          onClick={() => {
            resetGame({ mode: GameMode.MAIN })
          }}
          title="Cancel">
          <X size={24} strokeWidth={2} />
        </button>
      )}

      <SpeedRunTimer />

      {showSpeedRunButtons && (
        <button
          type="button"
          className="flex size-10 items-center justify-center rounded bg-amber-700 text-white transition hover:bg-amber-400/70"
          onClick={startSpeedRun}
          title="Restart">
          <RotateCcw size={24} strokeWidth={2} />
        </button>
      )}
    </div>
  )
}

type SpeedrunOverlayProps = {
  ref: Ref<HTMLDivElement>
  transitionStatus: TransitionStatus
}

// Overlay handles the countdown and name input if needed.
export const SpeedRunOverlay: FC<SpeedrunOverlayProps> = ({ ref, transitionStatus }) => {
  const username = useGameStore((s) => s.username)
  const setSpeedRunStage = useGameStore((s) => s.setSpeedRunStage)
  const speedRunStage = useGameStore((s) => s.speedRunStage)
  const setUsername = useGameStore((s) => s.setUsername)

  const [inputValue, setInputValue] = useState(username ?? '')
  const isValid = inputValue.trim().length > 0

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
  }

  const usernameInput = useRef<HTMLInputElement>(null)

  const handleUsernameSubmit = () => {
    const value = inputValue.trim()
    if (!value || value.length === 0) return
    setUsername(value)
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
      <CountdownNumber id="countdown-3" number={3} />
      <CountdownNumber id="countdown-2" number={2} />
      <CountdownNumber id="countdown-1" number={1} />
    </div>
  )

  const usernameForm = (
    <div className="flex items-stretch gap-2">
      <Input
        ref={usernameInput}
        id="username-input"
        className="border-none"
        maxLength={12}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder="enter a username"
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            handleUsernameSubmit()
          }
        }}
      />
      <button
        type="button"
        onClick={handleUsernameSubmit}
        disabled={!isValid}
        className={twJoin(
          'flex aspect-square items-center justify-center transition-colors',
          isValid ? 'bg-amber-500 text-black hover:bg-amber-400' : 'bg-white/10 text-white/20',
        )}
        aria-label="Submit username">
        <ArrowRight size={32} strokeWidth={3} />
      </button>
    </div>
  )

  return (
    <div
      ref={ref}
      className={twJoin(
        'fixed inset-0 z-10 flex size-full flex-col items-center justify-center gap-6 bg-radial from-[#000]/90 from-25% to-[#000]/0 to-100% backdrop-blur-sm transition-opacity duration-200',
        transitionStatus === 'entered' && 'opacity-100',
        transitionStatus === 'exiting' && 'opacity-0',
        transitionStatus === 'exited' && 'opacity-0',
      )}>
      <SwitchTransition>
        <Transition
          key={switchKey}
          timeout={{ enter: 0, exit: 200 }}
          nodeRef={contentContainer}
          appear={true}
          onEnter={onContentEnter}
          mountOnEnter
          unmountOnExit>
          {(status) => (
            <div
              ref={contentContainer}
              className={twJoin(
                'opacity-0 transition-opacity duration-200',
                status === 'entering' && 'opacity-100',
                status === 'entered' && 'opacity-100',
              )}>
              {showCountdown && countdown}
              {showUsernameInput && usernameForm}
            </div>
          )}
        </Transition>
      </SwitchTransition>
    </div>
  )
}

const CountdownNumber: FC<{ id: string; number: number }> = ({ id, number }) => {
  return (
    <div id={id} className="absolute text-[120px] font-black opacity-0">
      {number}
    </div>
  )
}

// background-image: radial-gradient(circle at 50% 106.013vh, rgb(255, 211, 126) 0vh, rgb(230, 64, 127) 50vh, rgb(108, 28, 101) 90vh, rgba(32, 31, 66, 0) 112.219vh); opacity: 0.655;

// mask-image: url(&quot;/VI/_next/static/media/VIstack.bc737d6e.svg&quot;); background-image: url(&quot;/VI/_next/static/media/VIstack.bc737d6e.svg&quot;); mask-size: clamp(20.0006vh, 25.0004%, 30vh); background-size: clamp(20.0006vh, 25.0004%, 30vh); -webkit-mask-position-x: 50%; background-position-x: 50%;
