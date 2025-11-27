'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { FlagIcon } from 'lucide-react'

import AudioToggle from '@/components/ui/AudioToggle'
import Controls from '@/components/ui/controls/Controls'
import CollectiblesUI, { RingsUI } from '@/components/ui/CollectiblesUI'
import ProgressBar from '@/components/ui/ProgressBar'
import { useGameStore } from '@/components/GameProvider'
import { twJoin } from 'tailwind-merge'
import { LeaderboardOverlay } from './speedRun/LeaderboardOverlay'
import { SpeedRunControls, SpeedRunOverlay, SpeedRunTimer } from './speedRun/SpeedRunUI'
import { GameMode } from '@/stores/types'

gsap.registerPlugin(useGSAP)

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = ({ isMobile }) => {
  const mode = useGameStore((s) => s.mode)
  const isSpeedRunMode = mode === GameMode.SPEEDRUN
  const speedRunStatus = useGameStore((s) => s.speedRunStage)
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)

  const infoContainer = useRef<HTMLDivElement>(null)
  const speedRunOverlay = useRef<HTMLDivElement>(null)
  const leaderboardOverlay = useRef<HTMLDivElement>(null)

  const showSpeedRunOverlay =
    isSpeedRunMode && ['countdown', 'username'].includes(speedRunStatus)

  const showLeaderboardOverlay =
    isSpeedRunMode && ['submitting', 'leaderboard'].includes(speedRunStatus)

  const showSpeedRunControls = isSpeedRunMode && speedRunStatus === 'running'

  return (
    <>
      <ProgressBar />

      <div className="gap-y-auto pointer-events-none fixed inset-0 z-100 grid grid-cols-3 grid-rows-2 gap-x-2 p-4 select-none">
        {/* Top Left Rings */}
        <RingsUI />
        {/* Top Center Info */}
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
                    'pointer-events-none flex h-fit items-center justify-center gap-2 opacity-0 transition-opacity duration-200',
                    status === 'exiting' && 'opacity-0',
                    status === 'entering' && 'opacity-100',
                    status === 'entered' && 'opacity-100',
                  )}>
                  {isSpeedRunMode ? <SpeedRunTimer /> : <CollectiblesUI />}
                </section>
              )
            }}
          </Transition>
        </SwitchTransition>
        {/* Top Right Audio */}
        <AudioToggle />

        {/* Bottom left */}
        {showSpeedRunControls ? (
          <SpeedRunControls />
        ) : !isSpeedRunMode ? (
          <button
            type="button"
            className="pointer-events-auto size-fit self-end rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-black uppercase transition md:text-sm"
            onClick={startSpeedRun}>
            <FlagIcon className="mr-2 inline-block" strokeWidth={2.5} size={20} />
            Start Speedroll
          </button>
        ) : (
          <div className="size-0 opacity-0" />
        )}

        <div className="size-0 opacity-0" />

        {/* Bottom Right Controls */}
        <Controls isMobile={isMobile} />
      </div>

      {/* Fullscreen overlays */}
      <Transition
        in={showSpeedRunOverlay}
        timeout={{ enter: 0, exit: 240 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={speedRunOverlay}>
        {(status) => <SpeedRunOverlay ref={speedRunOverlay} transitionStatus={status} />}
      </Transition>

      <Transition
        in={showLeaderboardOverlay}
        timeout={{ enter: 0, exit: 300 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={leaderboardOverlay}>
        {(status) => <LeaderboardOverlay ref={leaderboardOverlay} transitionStatus={status} />}
      </Transition>
    </>
  )
}

export default UI
