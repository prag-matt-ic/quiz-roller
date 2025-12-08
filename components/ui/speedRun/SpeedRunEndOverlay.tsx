'use client'
import { Rotate3DIcon, RotateCcwIcon, Share2Icon, SmilePlus, Trophy } from 'lucide-react'
import { type FC } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { PointerProvider } from '@/components/ui/PointerProvider'
import { RingsPanel } from '@/components/ui/dashboard/RingsPanel'
import TimeScorePanel from '@/components/ui/dashboard/TimeScorePanel'
import { TimesFallenPanel } from '@/components/ui/dashboard/TimesFallenPanel'
import Panel from '@/components/ui/panel/Panel'
import { PanelHeader } from '@/components/ui/panel/PanelHeader'
import { useWebShare } from '@/hooks/useWebShare'
import { GameMode } from '@/stores/types'

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

  return (
    <PointerProvider isMobile={isMobile}>
      <div
        ref={ref}
        className={twJoin(
          'bg-black/40 backdrop-blur-sm',
          'fixed inset-0 z-500 flex items-center justify-center transition-opacity duration-300 ease-out',
          transitionStatus === 'entering' && 'opacity-0',
          transitionStatus === 'entered' && 'opacity-100',
          transitionStatus === 'exiting' && 'opacity-0',
        )}>
        <section className="grid max-h-full w-xl max-w-full grid-cols-1 gap-3 overflow-y-auto px-2 py-8 xl:w-6xl xl:grid-cols-2 xl:gap-4">
          <Panel className="" strength={1}>
            <h2 className="text-2xl font-bold lg:text-4xl">Congratulations!</h2>
            <p className="mt-3 max-w-md text-sm text-white/80 xl:text-base">
              You completed the speedrun TODO: tailored message based on performance.
            </p>
          </Panel>

          {/* Table needs to be kept simple (e.g no access to the game store from within it otherwise it breaks in CTAELEMENTs) */}
          <Panel
            strength={3}
            className={twJoin('row-span-3 row-start-3 xl:col-start-2 xl:row-start-1')}
            attractorClassName="bg-emerald-400/15">
            <PanelHeader icon={Trophy} label="Leaderboard" />
            <LeaderboardTable {...tableData} onStartSpeedRun={startCountdown} showCTA={false} />
          </Panel>

          <div className="col-span-full grid grid-cols-3 gap-3 xl:col-span-1 xl:gap-4">
            <TimeScorePanel />
            <RingsPanel />
            <TimesFallenPanel />
          </div>

          <Panel className="flex items-center gap-3" strength={1}>
            {isShareSupported && (
              <Button
                color="light"
                variant="secondary"
                endIcon={SmilePlus}
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
            <Button
              color="light"
              variant="primary"
              onClick={startCountdown}
              endIcon={RotateCcwIcon}>
              Retry
            </Button>
            <Button
              color="light"
              variant="secondary"
              onClick={() => resetGame({ mode: GameMode.LEARN })}>
              Finish
            </Button>
          </Panel>
        </section>
      </div>
    </PointerProvider>
  )
}
