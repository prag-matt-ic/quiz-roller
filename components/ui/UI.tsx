'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'

import AudioToggle from '@/components/ui/AudioToggle'
import Controls from '@/components/ui/controls/Controls'
import Collectibles from '@/components/ui/Collectibles'
import ProgressBar from '@/components/ui/ProgressBar'
import { useGameStore } from '@/components/GameProvider'
import { twJoin } from 'tailwind-merge'
import { SpeedrunLeaderboard } from './SpeedrunLeaderboard'
import { SpeedRunControls, SpeedRunOverlay, SpeedRunTimer } from './speedRun/SpeedRunUI'

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

      {showLeaderboard && <SpeedrunLeaderboard />}

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
                {isSpeedRunMode ? <SpeedRunTimer /> : <Collectibles />}
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
        {(status) => <SpeedRunOverlay ref={speedRunOverlay} transitionStatus={status} />}
      </Transition>

      {isSpeedRunMode && speedRunStatus === 'running' && <SpeedRunControls />}
    </>
  )
}

export default UI
