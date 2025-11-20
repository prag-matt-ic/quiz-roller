'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { RotateCcw, X } from 'lucide-react'
import { type FC, Ref, Suspense, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'

import AudioToggle from '@/components/ui/AudioToggle'
import Controls from '@/components/ui/controls/Controls'
import Collectibles from '@/components/ui/Collectibles'
import ProgressBar from '@/components/ui/ProgressBar'
import { useGameStore } from '@/components/GameProvider'
import { SpeedRunTimeDisplay } from './TimeDisplay'
import { twJoin } from 'tailwind-merge'
import { SpeedrunLeaderboard } from './SpeedrunLeaderboard'

gsap.registerPlugin(useGSAP)

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = ({ isMobile }) => {
  const isSpeedRunMode = useGameStore((s) => s.isSpeedRunMode)
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)

  const speedRunStatus = useGameStore((s) => s.speedRunStage)

  const showLeaderboard = isSpeedRunMode && speedRunStatus === 'leaderboard'
  const showSpeedRunOverlay =
    isSpeedRunMode && ['countdown', 'username'].includes(speedRunStatus)

  const infoContainer = useRef<HTMLDivElement>(null)
  const speedRunOverlay = useRef<HTMLDivElement>(null)

  return (
    <>
      <Controls isMobile={isMobile} />
      <ProgressBar />

      {/* TODO: skeleton table with flashing loading state. Export the skeleton from SpeedrunLeaderboard, using same width, grid layout etc. */}
      {showLeaderboard && (
        <Suspense fallback={<div>Loading...</div>}>
          <SpeedrunLeaderboard />
        </Suspense>
      )}

      {/* Top Info */}
      <SwitchTransition>
        <Transition
          key={isSpeedRunMode ? 'timer' : 'collectibles'}
          timeout={{ enter: 0, exit: 240 }}
          appear={true}
          nodeRef={infoContainer}>
          {(status: TransitionStatus) => {
            return (
              <section
                ref={infoContainer}
                className={twJoin(
                  'pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-center gap-2 border p-6 opacity-0 transition-opacity duration-200',
                  status === 'exiting' && 'opacity-0',
                  status === 'entering' && 'opacity-100',
                  status === 'entered' && 'opacity-100',
                )}>
                {isSpeedRunMode ? <SpeedrunTimer /> : <Collectibles />}
              </section>
            )
          }}
        </Transition>
      </SwitchTransition>

      <AudioToggle />

      <button
        type="button"
        className="pointer-events-auto fixed top-6 right-24 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/30"
        onClick={startSpeedRun}>
        Start Speedrun
      </button>

      <Transition
        in={showSpeedRunOverlay}
        timeout={{ enter: 0, exit: 240 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={speedRunOverlay}>
        {(status) => <SpeedrunOverlay ref={speedRunOverlay} transitionStatus={status} />}
      </Transition>

      {isSpeedRunMode && speedRunStatus === 'running' && <SpeedRunControls />}
    </>
  )
}

export default UI

const SpeedrunTimer: FC = () => {
  const speedRunStatus = useGameStore((s) => s.speedRunStage)
  const isAmber = speedRunStatus === 'countdown' || speedRunStatus === 'username'
  const isFinished = speedRunStatus === 'submitting' || speedRunStatus === 'leaderboard'
  return (
    <div className="flex flex-col items-center gap-2 overflow-hidden">
      <div className="flex items-center gap-3">
        <div
          className={twJoin(
            'size-2.5',
            isAmber ? 'bg-amber-400' : isFinished ? 'bg-white' : 'bg-green-500',
          )}
        />
        <h2 className="text-xs tracking-widest text-white/60 uppercase">Speedroll</h2>
      </div>
      <SpeedRunTimeDisplay className="font-mono text-4xl leading-none font-semibold tracking-tight sm:text-5xl" />
    </div>
  )
}

const SpeedRunControls: FC = () => {
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const stopSpeedRun = useGameStore((s) => s.stopSpeedRun)
  const finishSpeedRun = useGameStore((s) => s.finishSpeedRun)
  return (
    <div className="fixed bottom-0 left-0 mx-auto flex justify-center select-none">
      <div className="flex gap-3 rounded-t-xl bg-black/80 p-3">
        <button
          type="button"
          className="flex size-12 items-center justify-center rounded bg-red-500/50 text-white transition hover:bg-red-500/70"
          onClick={stopSpeedRun}
          title="Cancel">
          <X size={28} strokeWidth={2} />
        </button>

        <button
          type="button"
          className="flex size-12 h-full items-center justify-center rounded bg-amber-400/50 text-white transition hover:bg-amber-400/70"
          onClick={startSpeedRun}
          title="Restart">
          <RotateCcw size={28} strokeWidth={2} />
        </button>

        <button type="button" onClick={finishSpeedRun}>
          FINISH!!!
        </button>
      </div>
    </div>
  )
}

type SpeedrunOverlayProps = {
  ref: Ref<HTMLDivElement>
  transitionStatus: TransitionStatus
}

// Overlay handles the countdown and name input if needed.
const SpeedrunOverlay: FC<SpeedrunOverlayProps> = ({ ref, transitionStatus }) => {
  const username = useGameStore((s) => s.username)
  const setSpeedRunStage = useGameStore((s) => s.setSpeedRunStage)
  const speedRunStage = useGameStore((s) => s.speedRunStage)
  const setUsername = useGameStore((s) => s.setUsername)

  const onCountdownComplete = useGameStore((s) => s.onCountdownComplete)

  const showUsernameInput = speedRunStage === 'username'
  const showCountdown = speedRunStage === 'countdown'
  const switchKey = `${showUsernameInput}-${showCountdown}`

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
    <input
      ref={usernameInput}
      id="username-input"
      className="bg-black px-4 py-3 text-left text-3xl font-bold outline-none placeholder:text-white/60 focus:ring focus:ring-amber-400"
      maxLength={12}
      defaultValue={username ?? ''}
      placeholder="enter a username"
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault()
          const value = e.currentTarget.value.trim()
          if (!value) return
          if (value.length === 0) return
          setUsername(value)
          setSpeedRunStage('countdown')
        }
      }}
    />
  )

  return (
    <div
      ref={ref}
      className={twJoin(
        'fixed inset-0 z-10 flex size-full flex-col items-center justify-center gap-6 bg-black/97 transition-opacity duration-200',
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
            <div ref={contentContainer}>{showCountdown ? countdown : usernameForm}</div>
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
