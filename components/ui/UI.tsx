'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { LayoutDashboardIcon } from 'lucide-react'
import { type FC, useRef } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import CollectiblesUI from '@/components/ui/CollectiblesUI'
import RingsUI from '@/components/ui/RingsUI'
import MovementControls from '@/components/ui/controls/Controls'
import { Dashboard } from '@/components/ui/dashboard/Dashboard'
import MiniMap from '@/components/ui/miniMap/MiniMap'
import { GameMode, Overlay } from '@/stores/types'

import { SpeedRunCountdownOverlay } from './speedRun/SpeedRunCountdownOverlay'
import { SpeedrunEndOverlay } from './speedRun/SpeedRunEndOverlay'
import { SpeedRunStartOverlay } from './speedRun/SpeedRunStartOverlay'
import { SpeedRunControls } from './speedRun/SpeedRunUI'

gsap.registerPlugin(useGSAP)

type Props = { isMobile: boolean }

const UI: FC<Props> = ({ isMobile }) => {
  const mode = useGameStore((s) => s.mode)
  const overlay = useGameStore((s) => s.overlay)
  const setOverlay = useGameStore((s) => s.setOverlay)
  const isSpeedRunMode = mode === GameMode.SPEEDRUN

  const infoContainer = useRef<HTMLDivElement>(null)
  const dashboardRef = useRef<HTMLDivElement>(null)
  const speedRunStartOverlay = useRef<HTMLDivElement>(null)
  const speedRunCountdownOverlay = useRef<HTMLDivElement>(null)
  const speedRunEndOverlay = useRef<HTMLDivElement>(null)

  return (
    <>
      <div
        className={twJoin(
          'gap-y-auto pointer-events-none fixed inset-x-0 top-0 z-100 grid grid-cols-3 grid-rows-1 items-center gap-x-2 px-3 py-2 transition-opacity duration-300 select-none',
          overlay === Overlay.LANDING ? 'opacity-0' : 'opacity-100',
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
                    'flex h-fit items-center justify-center gap-2.5 opacity-0 transition-opacity duration-200',
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
          onClick={() => setOverlay(Overlay.DASHBOARD)}
          className="pointer-events-auto flex items-center justify-self-end rounded-xl border border-black/40 bg-black/30 px-6 py-2.5 text-xs text-white uppercase transition hover:border-black/30 hover:bg-black/20 lg:px-5 lg:py-3 lg:text-sm">
          <LayoutDashboardIcon className="size-4 lg:size-6" strokeWidth={1.5} />
        </button>
      </div>

      <MiniMap />
      <MovementControls />

      {/* Fullscreen overlays */}
      <Transition
        in={overlay === Overlay.DASHBOARD}
        timeout={{ enter: 0, exit: 400 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={dashboardRef}>
        {(status) => (
          <Dashboard
            ref={dashboardRef}
            isMobile={isMobile}
            transitionStatus={status}
            onClose={() => setOverlay(Overlay.NONE)}
          />
        )}
      </Transition>

      <Transition
        in={overlay === Overlay.SPEEDRUN_START}
        timeout={{ enter: 0, exit: 500 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={speedRunStartOverlay}>
        {(status) => (
          <SpeedRunStartOverlay ref={speedRunStartOverlay} transitionStatus={status} />
        )}
      </Transition>

      <Transition
        in={overlay === Overlay.SPEEDRUN_COUNTDOWN}
        timeout={{ enter: 0, exit: 300 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={speedRunCountdownOverlay}>
        {(status) => (
          <SpeedRunCountdownOverlay ref={speedRunCountdownOverlay} transitionStatus={status} />
        )}
      </Transition>

      <Transition
        in={overlay === Overlay.SPEEDRUN_END}
        timeout={{ enter: 0, exit: 300 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={speedRunEndOverlay}>
        {(status) => (
          <SpeedrunEndOverlay
            ref={speedRunEndOverlay}
            transitionStatus={status}
            isMobile={isMobile}
          />
        )}
      </Transition>
    </>
  )
}

export default UI
