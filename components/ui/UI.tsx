'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { FlagIcon } from 'lucide-react'

import AudioToggle from '@/components/ui/AudioToggle'
import Controls from '@/components/ui/controls/Controls'
import CollectiblesUI from '@/components/ui/CollectiblesUI'
import ProgressBar from '@/components/ui/ProgressBar'
import { useGameStore } from '@/components/GameProvider'
import { twJoin } from 'tailwind-merge'
import { LeaderboardOverlay } from './speedRun/LeaderboardOverlay'
import { SpeedRunControls, SpeedRunOverlay, SpeedRunTimer } from './speedRun/SpeedRunUI'

gsap.registerPlugin(useGSAP)

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = ({ isMobile }) => {
  const isSpeedRunMode = useGameStore((s) => s.isSpeedRunMode)
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)

  const speedRunStatus = useGameStore((s) => s.speedRunStage)

  const showSpeedRunOverlay =
    isSpeedRunMode && ['countdown', 'username'].includes(speedRunStatus)

  const showLeaderboard =
    isSpeedRunMode && ['submitting', 'leaderboard'].includes(speedRunStatus)

  const infoContainer = useRef<HTMLDivElement>(null)
  const speedRunOverlay = useRef<HTMLDivElement>(null)

  return (
    <>
      <Controls isMobile={isMobile} />
      <ProgressBar />

      {showLeaderboard && <LeaderboardOverlay />}

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
                  'pointer-events-none fixed inset-x-0 top-0 z-20 flex items-center justify-center gap-2 p-6 opacity-0 transition-opacity duration-200',
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

      <AudioToggle />

      <button
        type="button"
        className="pointer-events-auto fixed top-6 right-24 rounded-lg bg-white px-4 py-2 text-sm font-bold text-black uppercase transition"
        onClick={startSpeedRun}>
        <FlagIcon className="mr-2 inline-block" strokeWidth={2.5} size={20} />
        Start Speedroll
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
