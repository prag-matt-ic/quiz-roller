'use client'
import { type FC } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { PointerProvider } from '@/components/ui/PointerProvider'
import { CollectiblesPanel } from '@/components/ui/dashboard/CollectiblesPanel'
import { LeaderboardPanel } from '@/components/ui/dashboard/LeaderboardPanel'
import { RingsPanel } from '@/components/ui/dashboard/RingsPanel'
import TimeScorePanel from '@/components/ui/dashboard/TimeScorePanel'
import { GameMode } from '@/stores/types'

import { TimesFallenPanel } from '../dashboard/TimesFallenPanel'
import Panel from '../panel/Panel'

type Props = {
  ref: React.RefObject<HTMLDivElement | null>
  transitionStatus: TransitionStatus
  isMobile: boolean
}

// Fullscreen overlay version of the table shown at the end of a speedrun in the UI.

export const SpeedrunEndOverlay: FC<Props> = ({ ref, transitionStatus, isMobile }) => {
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <PointerProvider isMobile={isMobile}>
      <div
        ref={ref}
        className={twJoin(
          'bg-radial from-black/90 from-20% to-black/20 backdrop-blur-sm',
          'fixed inset-0 z-100 grid grid-cols-1 flex-col items-center justify-center gap-4 px-4 py-4 transition-opacity duration-300 ease-out md:grid-cols-2 lg:gap-6 lg:px-8 lg:py-16',
          transitionStatus === 'entering' && 'opacity-0',
          transitionStatus === 'entered' && 'opacity-100',
          transitionStatus === 'exiting' && 'opacity-0',
        )}>
        {/* Table needs to be kept simple (e.g no access to the game store from within it otherwise it breaks in CTAELEMENTs) */}
        <LeaderboardPanel
          count={10}
          showCTA={false}
          fetchPlayerRecentPosition={true}
          className={twJoin(
            'col-start-2 row-start-1 lg:max-h-3/4',
            isMobile && 'overflow-y-scroll',
          )}
        />
        <section className="col-start-1 row-start-1 grid h-full grid-cols-2 gap-2 rounded-xl px-4 py-3 lg:h-3/4 lg:gap-4">
          <Panel
            className="col-span-2 col-start-1 row-start-1 flex flex-col items-center justify-center lg:gap-2"
            attractorClassName="bg-amber-400/[0.125] bg-linear-70 from-white/10 to-transparent">
            <h2 className="text-2xl uppercase lg:text-4xl">congratulations!</h2>
            <p className="flex text-xs text-white/60 lg:text-sm">
              You completed the level, now do it again but be quicker.
            </p>
          </Panel>
          <TimeScorePanel className="col-span-1 col-start-1 row-span-1 row-start-2" />
          <CollectiblesPanel className="col-span-1 col-start-2 row-span-1 row-start-2" />
          <RingsPanel className="col-span-1 col-start-1 row-span-1 row-start-3" />
          <TimesFallenPanel className="col-span-1 col-start-2 row-span-1 row-start-3" />

          <div className="col-span-2 col-start-1 row-start-4 flex items-center justify-between gap-4">
            <Button
              color="light"
              variant="secondary"
              onClick={() => {
                console.warn('share score')
              }}>
              Share
            </Button>
            <Button color="light" variant="primary" onClick={startSpeedRun}>
              Retry
            </Button>
            <Button
              color="light"
              variant="secondary"
              onClick={() => resetGame({ mode: GameMode.LEARN })}>
              Finish
            </Button>
          </div>
        </section>
      </div>
    </PointerProvider>
  )
}
