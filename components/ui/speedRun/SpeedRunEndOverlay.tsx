'use client'
import { Joystick, Keyboard, LogOutIcon, RotateCcwIcon, SmilePlus, Trophy } from 'lucide-react'
import { type FC, useEffect, useLayoutEffect, useState } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import { PointerProvider } from '@/components/ui/PointerProvider'
import { FeedbackPanel } from '@/components/ui/dashboard/FeedbackPanel'
import { RingsPanel } from '@/components/ui/dashboard/RingsPanel'
import TimeScorePanel from '@/components/ui/dashboard/TimeScorePanel'
import { TimesFallenPanel } from '@/components/ui/dashboard/TimesFallenPanel'
import Panel from '@/components/ui/panel/Panel'
import { PanelHeader } from '@/components/ui/panel/PanelHeader'
import { LeaderboardTable } from '@/components/ui/speedRun/LeaderboardTable'
import { type PerformanceSummary } from '@/components/ui/speedRun/speedrunPerformanceSummary'
import { useWebShare } from '@/hooks/useWebShare'
import { GameMode, InputType } from '@/stores/types'

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
  const leaderboardFilter = useGameStore((s) => s.leaderboardFilter)
  const setLeaderboardFilter = useGameStore((s) => s.setLeaderboardFilter)
  const platformVersion = useGameStore((s) => s.platformVersion)
  const completedSpeedRuns = useGameStore((s) => s.completedSpeedRuns[platformVersion] ?? [])
  const { handleShare, isShareSupported } = useWebShare()

  const [performanceSummary, setPerformanceSummary] = useState<PerformanceSummary | null>(null)
  const summaryHeading = performanceSummary?.heading ?? ''
  const summaryDescription = performanceSummary?.description ?? ''

  const latestRunInputType =
    completedSpeedRuns[completedSpeedRuns.length - 1]?.input_type ?? null

  useLayoutEffect(() => {
    if (latestRunInputType !== InputType.KEYS && latestRunInputType !== InputType.JOYSTICK)
      return
    setLeaderboardFilter(latestRunInputType as InputType)
  }, [latestRunInputType, setLeaderboardFilter])

  return (
    <PointerProvider isMobile={isMobile}>
      <div
        ref={ref}
        className={twJoin(
          'fixed inset-0 z-500 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-300 ease-out',
          transitionStatus === 'entering' && 'opacity-0',
          transitionStatus === 'entered' && 'opacity-100',
          transitionStatus === 'exiting' && 'opacity-0',
        )}>
        <section className="grid max-h-full w-xl max-w-full grid-cols-1 gap-3 overflow-y-auto px-2 py-8 xl:w-6xl xl:grid-cols-2 xl:grid-rows-[1fr_auto_auto] xl:gap-4">
          <Panel className="h-full" strength={3}>
            <h2 className="text-2xl font-bold lg:text-4xl">{summaryHeading}</h2>
            <p className="mt-3 max-w-md text-sm text-white/80 xl:text-lg">
              {summaryDescription}
            </p>
          </Panel>

          <Panel
            strength={3}
            className="row-span-3 row-start-3 xl:col-start-2 xl:row-start-1"
            attractorClassName="bg-emerald-400/15">
            {/* TODO: this should only show the current input type for the recent run. */}
            <PanelHeader icon={Trophy} label="Leaderboard">
              <ButtonGroup
                value={leaderboardFilter}
                onChange={setLeaderboardFilter}
                items={[
                  { label: 'Keyboard', value: InputType.KEYS, Icon: Keyboard },
                  { label: 'Joystick', value: InputType.JOYSTICK, Icon: Joystick },
                ]}
              />
            </PanelHeader>
            <LeaderboardTable
              count={LEADERBOARD_COUNT}
              fetchLatestRun={true}
              showCTA={false}
              onPerformanceSummary={setPerformanceSummary}
            />
          </Panel>

          <div className="col-span-full grid grid-cols-3 gap-3 xl:col-span-1 xl:gap-4">
            <TimeScorePanel />
            <RingsPanel />
            <TimesFallenPanel />
          </div>

          <FeedbackPanel />

          <Panel className="col-span-full flex items-center justify-center gap-3" strength={1}>
            {isShareSupported && (
              <Button
                variant="secondary"
                size="md"
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
            <Button variant="primary" onClick={startCountdown} endIcon={RotateCcwIcon}>
              Retry
            </Button>
            <Button
              size="md"
              variant="secondary"
              endIcon={LogOutIcon}
              onClick={() => resetGame({ mode: GameMode.LEARN })}>
              Finish
            </Button>
          </Panel>
        </section>
      </div>
    </PointerProvider>
  )
}

const LEADERBOARD_COUNT = 10
