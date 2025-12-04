'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { LayoutDashboardIcon } from 'lucide-react'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import CollectiblesUI from '@/components/ui/CollectiblesUI'
import ProgressBar from '@/components/ui/ProgressBar'
import RingsUI from '@/components/ui/RingsUI'
import MovementControls from '@/components/ui/controls/Controls'
import { Dashboard } from '@/components/ui/dashboard/Dashboard'
import { GameMode } from '@/stores/types'

import { SpeedrunEndOverlay } from './speedRun/SpeedRunEndOverlay'
import { SpeedRunStartOverlay } from './speedRun/SpeedRunStartOverlay'
import { SpeedRunControls } from './speedRun/SpeedRunUI'

gsap.registerPlugin(useGSAP)

type Props = { isMobile: boolean }

const UI: FC<Props> = ({ isMobile }) => {
  const isShowingLoadingOverlay = useGameStore((s) => s.isShowingLoadingOverlay)
  const isShowingDashboard = useGameStore((s) => s.isShowingDashboard)
  const setIsShowingDashboard = useGameStore((s) => s.setIsShowingDashboard)
  const mode = useGameStore((s) => s.mode)
  const isSpeedRunMode = mode === GameMode.SPEEDRUN
  const isShowingSpeedRunStartOverlay = useGameStore((s) => s.isShowingSpeedRunStartOverlay)
  const isShowingSpeedRunEndOverlay = useGameStore((s) => s.isShowingSpeedRunEndOverlay)

  const infoContainer = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const speedRunOverlayRef = useRef<HTMLDivElement>(null)
  const leaderboardOverlay = useRef<HTMLDivElement>(null)

  return (
    <>
      <ProgressBar />

      <div
        className={twJoin(
          'gap-y-auto pointer-events-none fixed inset-x-0 top-0 z-100 grid grid-cols-3 grid-rows-1 gap-x-2 transition-opacity duration-300 select-none',
          isShowingLoadingOverlay ? 'opacity-0' : 'opacity-100',
        )}>
        {/* Top Left Rings */}
        <RingsUI />
        {/* Top Center Info */}
        <SwitchTransition>
          <Transition
            key={isSpeedRunMode ? 'speed-run' : 'collectibles'}
            timeout={{ enter: 0, exit: 240 }}
            appear={true}
            nodeRef={infoContainer}>
            {(status: TransitionStatus) => {
              return (
                <section
                  ref={infoContainer}
                  className={twJoin(
                    'flex h-fit items-center justify-center gap-2.5 pt-2 opacity-0 transition-opacity duration-200 lg:pt-4',
                    status === 'exiting' && 'opacity-0',
                    status === 'entering' && 'opacity-100',
                    status === 'entered' && 'opacity-100',
                  )}>
                  {isSpeedRunMode ? <SpeedRunControls /> : <CollectiblesUI />}
                </section>
              )
            }}
          </Transition>
        </SwitchTransition>
        {/* Top Right Menu toggle */}
        <button
          type="button"
          onClick={() => setIsShowingDashboard(true)}
          className="pointer-events-auto flex items-center gap-2.5 self-start justify-self-end rounded-none rounded-bl-2xl border border-black/20 bg-black/15 px-6 py-2.5 text-xs text-white uppercase backdrop-blur-sm transition hover:border-black/30 hover:bg-black/20 lg:px-5 lg:py-3 lg:text-sm">
          <span className="hidden font-bold text-white/80 lg:block">Menu</span>
          <LayoutDashboardIcon className="size-4 lg:size-5" />
        </button>
      </div>

      {/* Movement Controls */}
      <MovementControls />

      {/* Fullscreen overlays */}
      <Transition
        in={isShowingDashboard}
        timeout={{ enter: 0, exit: 400 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={dashboardRef}>
        {(status) => (
          <Dashboard
            ref={dashboardRef}
            isMobile={isMobile}
            transitionStatus={status}
            onClose={() => setIsShowingDashboard(false)}
          />
        )}
      </Transition>

      <Transition
        in={isShowingSpeedRunStartOverlay}
        timeout={{ enter: 0, exit: 500 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={speedRunOverlayRef}>
        {(status) => (
          <SpeedRunStartOverlay ref={speedRunOverlayRef} transitionStatus={status} />
        )}
      </Transition>

      <Transition
        in={isShowingSpeedRunEndOverlay}
        timeout={{ enter: 0, exit: 300 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={leaderboardOverlay}>
        {(status) => <SpeedrunEndOverlay ref={leaderboardOverlay} transitionStatus={status} />}
      </Transition>
    </>
  )
}

export default UI
