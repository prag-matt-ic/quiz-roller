'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useRef, useState } from 'react'
import { Transition } from 'react-transition-group'

import AudioToggle from '@/components/ui/AudioToggle'
import Controls from '@/components/ui/controls/Controls'
import Collectibles from '@/components/ui/Collectibles'
import ProgressBar from '@/components/ui/ProgressBar'
import { useGameStore } from '@/components/GameProvider'
import { LiveTimeDisplay } from './TimeDisplay'
import { twJoin } from 'tailwind-merge'

gsap.registerPlugin(useGSAP)

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = ({ isMobile }) => {
  const collectibles = useRef<HTMLDivElement>(null)
  const isSpeedRunMode = useGameStore((s) => s.isSpeedRunMode)
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const stopSpeedRun = useGameStore((s) => s.stopSpeedRun)
  const restartSpeedRun = useGameStore((s) => s.restartSpeedRun)

  useGSAP(
    () => {
      gsap.fromTo(
        collectibles.current,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.4, delay: 2, ease: 'power2.out' },
      )
    },
    { dependencies: [] },
  )

  return (
    <>
      <Controls isMobile={isMobile} />
      <ProgressBar />
      <Collectibles ref={collectibles} />
      <AudioToggle />

      <button
        type="button"
        className="pointer-events-auto fixed top-6 right-6 rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/30"
        onClick={isSpeedRunMode ? stopSpeedRun : startSpeedRun}>
        {isSpeedRunMode ? 'End Speedroll' : 'Begin Speedroll'}
      </button>

      <LiveTimeDisplay className="fixed top-5 font-mono text-4xl leading-none font-semibold" />

      {isSpeedRunMode && <SpeedRunHUD onRestart={restartSpeedRun} onStop={stopSpeedRun} />}
    </>
  )
}

export default UI

type SpeedRunHUDProps = {
  onRestart: () => void
  onStop: () => void
}

const SpeedRunHUD: FC<SpeedRunHUDProps> = ({ onRestart, onStop }) => {
  const [isShowingCountdown, setIsShowingCountdown] = useState(true)
  const setIsTiming = useGameStore((s) => s.setIsTiming)

  const countdownContainer = useRef<HTMLDivElement>(null)

  return (
    <>
      <section className="pointer-events-auto fixed inset-x-4 bottom-6 z-200">
        <div className="mx-auto flex w-fit flex-col gap-3 rounded-xl bg-black/80 p-3 text-white backdrop-blur select-none">
          <div className="flex items-center justify-between">
            <div
              className={twJoin('size-3', isShowingCountdown ? 'bg-amber-400' : 'bg-green-500')}
            />
            <h3 className="text-xs tracking-[0.3em] text-white/70 uppercase">Speedrun</h3>
          </div>

          <div className="relative overflow-hidden rounded-xl bg-white/8 p-2">
            <LiveTimeDisplay className="font-mono text-4xl leading-none font-semibold" />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="rounded-full border bg-white px-3 py-1 text-sm font-semibold text-black transition hover:text-white"
              onClick={onRestart}>
              Restart
            </button>
            <button
              type="button"
              className="rounded-full bg-white px-4 py-1 text-sm font-semibold text-black transition hover:bg-white/90"
              onClick={onStop}>
              Cancel
            </button>
          </div>
        </div>
      </section>
      <Transition
        in={isShowingCountdown}
        timeout={{ enter: 0, exit: 200 }}
        nodeRef={countdownContainer}
        onEnter={() => {
          gsap
            .timeline({
              onComplete: () => {
                // Start the timer.
                setIsTiming(true)
                setIsShowingCountdown(false)
              },
            })
            .fromTo(countdownContainer.current, { opacity: 0 }, { opacity: 1 })
            .set('#countdown-3', { opacity: 1 })
            .to('#countdown-3-span', {
              opacity: 0,
              duration: 1.0,
              ease: 'linear',
            })
            .set('#countdown-3', { opacity: 0 })
            .set('#countdown-2', { opacity: 1 })
            .to('#countdown-2-span', {
              opacity: 0,
              duration: 1.0,
              ease: 'linear',
            })
            .set('#countdown-2', { opacity: 0 })
            .set('#countdown-1', { opacity: 1 })
            .to('#countdown-1-span', {
              opacity: 0,
              duration: 1.0,
              ease: 'linear',
            })
            .set('#countdown-1', { opacity: 0 })
        }}
        mountOnEnter
        unmountOnExit>
        {(status) => (
          <div
            ref={countdownContainer}
            data-status={status}
            className="fixed inset-0 z-100 flex size-full flex-col items-center justify-center gap-6 bg-black/90 text-center backdrop-blur-sm">
            <span className="text-3xl font-semibold">GET READY</span>
            <div className="relative flex items-center justify-center p-10">
              <CountdownNumber id="countdown-3" overlayId="countdown-3-span" number={3} />
              <CountdownNumber id="countdown-2" overlayId="countdown-2-span" number={2} />
              <CountdownNumber id="countdown-1" overlayId="countdown-1-span" number={1} />
            </div>
          </div>
        )}
      </Transition>
    </>
  )
}

const CountdownNumber: FC<{ id: string; overlayId: string; number: number }> = ({
  id,
  overlayId,
  number,
}) => {
  return (
    <div id={id} className="absolute text-[120px] font-black opacity-0">
      <span className="relative opacity-10">3</span>
      <span id={overlayId} className="absolute inset-0 opacity-100">
        {number}
      </span>
    </div>
  )
}

// background-image: radial-gradient(circle at 50% 106.013vh, rgb(255, 211, 126) 0vh, rgb(230, 64, 127) 50vh, rgb(108, 28, 101) 90vh, rgba(32, 31, 66, 0) 112.219vh); opacity: 0.655;

// mask-image: url(&quot;/VI/_next/static/media/VIstack.bc737d6e.svg&quot;); background-image: url(&quot;/VI/_next/static/media/VIstack.bc737d6e.svg&quot;); mask-size: clamp(20.0006vh, 25.0004%, 30vh); background-size: clamp(20.0006vh, 25.0004%, 30vh); -webkit-mask-position-x: 50%; background-position-x: 50%;
