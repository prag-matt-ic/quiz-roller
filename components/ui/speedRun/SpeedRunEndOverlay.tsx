'use client'
import { Trophy } from 'lucide-react'
import { type FC } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { PointerProvider } from '@/components/ui/PointerProvider'
import { RingsPanel } from '@/components/ui/dashboard/RingsPanel'
import TimeScorePanel from '@/components/ui/dashboard/TimeScorePanel'
import { TimesFallenPanel } from '@/components/ui/dashboard/TimesFallenPanel'
import { useWebShare } from '@/hooks/useWebShare'
import { GameMode } from '@/stores/types'

import Panel from '../panel/Panel'
import { PanelHeader } from '../panel/PanelHeader'
import { LeaderboardTable, useLeaderboardTableData } from './LeaderboardTable'

type Props = {
  ref: React.RefObject<HTMLDivElement | null>
  transitionStatus: TransitionStatus
  isMobile: boolean
}

// Fullscreen overlay shown at the end of a speedrun

export const SpeedrunEndOverlay: FC<Props> = ({ ref, transitionStatus, isMobile }) => {
  const startCountdown = useGameStore((s) => s.startCountdown)
  const resetGame = useGameStore((s) => s.resetGame)
  const speedRunTimeCS = useGameStore((s) => s.speedRunTimeCS)
  const { handleShare, isShareSupported } = useWebShare()

  // TODO: tailor the congratulations message based on performance
  const tableData = useLeaderboardTableData({
    count: 10,
    fetchPlayerRecentPosition: true,
    showCTARow: false,
  })
  const attractorClassName = 'bg-emerald-400/15'

  return (
    <PointerProvider isMobile={isMobile}>
      <div
        ref={ref}
        className={twJoin(
          'bg-black/35 backdrop-blur-sm',
          'fixed inset-0 z-500 flex flex-col items-center justify-center gap-6 p-4 transition-opacity duration-300 ease-out',
          transitionStatus === 'entering' && 'opacity-0',
          transitionStatus === 'entered' && 'opacity-100',
          transitionStatus === 'exiting' && 'opacity-0',
        )}>
        <h2 className="text-2xl uppercase lg:text-4xl">Congratulations!</h2>

        <div className="grid max-w-6xl grid-cols-1 gap-3 border *:border lg:grid-cols-2 lg:gap-4">
          <div className="grid grid-cols-3 gap-2">
            <TimeScorePanel className="" />
            <RingsPanel />
            <TimesFallenPanel className="" />
          </div>

          {/* Table needs to be kept simple (e.g no access to the game store from within it otherwise it breaks in CTAELEMENTs) */}
          {/* <LeaderboardPanel
            count={10}
            showCTA={false}
            fetchPlayerRecentPosition={true}
            className={twJoin('row-span-3', isMobile && 'overflow-y-scroll')}
          /> */}

          <Panel
            strength={3}
            className={twJoin('row-span-3 flex h-full flex-col lg:gap-3')}
            attractorClassName={attractorClassName}>
            <PanelHeader icon={Trophy} label="Leaderboard" className="" />
            <LeaderboardTable {...tableData} onStartSpeedRun={startCountdown} showCTA={false} />
          </Panel>

          <div className="flex items-center justify-between gap-4">
            <p className="flex text-xs text-white/60 lg:text-sm">
              You completed the level, now do it again but be quicker.
            </p>
            {isShareSupported && (
              <Button
                color="light"
                variant="secondary"
                onClick={() => {
                  const seconds = (speedRunTimeCS / 100).toFixed(2)
                  handleShare({
                    text: `I just completed the speedrun in ${seconds}s! Can you beat my time?`,
                    url: window.location.origin,
                  })
                }}>
                Share
              </Button>
            )}
            <Button color="light" variant="primary" onClick={startCountdown}>
              Retry
            </Button>
            <Button
              color="light"
              variant="secondary"
              onClick={() => resetGame({ mode: GameMode.LEARN })}>
              Finish
            </Button>
          </div>
        </div>
      </div>
    </PointerProvider>
  )
}
