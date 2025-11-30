'use client'
import { useGSAP } from '@gsap/react'
import gsap from 'gsap'
import { MenuIcon, XIcon } from 'lucide-react'
import { type FC, useRef, useState } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import CollectiblesUI, { RingsUI } from '@/components/ui/CollectiblesUI'
import ProgressBar from '@/components/ui/ProgressBar'
import MovementControls from '@/components/ui/controls/Controls'
import Menu from '@/components/ui/menu/Menu'
import { GameMode } from '@/stores/types'

import { LeaderboardOverlay } from './speedRun/LeaderboardOverlay'
import { SpeedRunControls, SpeedRunOverlay } from './speedRun/SpeedRunUI'

gsap.registerPlugin(useGSAP)

type Props = {
  isMobile: boolean
}

const UI: FC<Props> = ({ isMobile }) => {
  const mode = useGameStore((s) => s.mode)
  const isSpeedRunMode = mode === GameMode.SPEEDRUN
  const speedRunStatus = useGameStore((s) => s.speedRunStage)

  const infoContainer = useRef<HTMLDivElement>(null)
  const speedRunOverlay = useRef<HTMLDivElement>(null)
  const leaderboardOverlay = useRef<HTMLDivElement>(null)

  const showSpeedRunOverlay =
    isSpeedRunMode && ['countdown', 'username'].includes(speedRunStatus)

  const showLeaderboardOverlay =
    isSpeedRunMode && ['submitting', 'leaderboard'].includes(speedRunStatus)

  const [showMenu, setShowMenu] = useState(false)

  return (
    <>
      <ProgressBar />

      <div className="gap-y-auto fixed inset-x-0 top-0 z-100 grid grid-cols-3 grid-rows-1 gap-x-2 border px-4 select-none *:border">
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
                    'pointer-events-none flex h-fit items-center justify-center gap-2.5 opacity-0 transition-opacity duration-200',
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
          onClick={() => setShowMenu((prev) => !prev)}
          className="pointer-events-auto place-self-end self-start p-2.5 text-white">
          <MenuIcon size={24} className="pointer-events-auto text-white" />
        </button>
      </div>

      {/* Movement Controls */}
      <MovementControls />

      {/* Fullscreen overlays */}
      <Transition
        in={showMenu}
        timeout={{ enter: 0, exit: 400 }}
        mountOnEnter={true}
        unmountOnExit={true}
        nodeRef={speedRunOverlay}>
        {(status) => (
          <Menu
            ref={speedRunOverlay}
            transitionStatus={status}
            closeMenu={() => setShowMenu(false)}
          />
        )}
      </Transition>

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
