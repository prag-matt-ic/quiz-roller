'use client'
import { type FC } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { GameMode } from '@/stores/types'

import { LeaderboardTable, useLeaderboardTableData } from './LeaderboardTable'

type Props = {
  ref: React.RefObject<HTMLDivElement | null>
  transitionStatus: TransitionStatus
}

// Fullscreen overlay version of the table shown at the end of a speedrun in the UI.

export const LeaderboardOverlay: FC<Props> = ({ ref, transitionStatus }) => {
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const resetGame = useGameStore((s) => s.resetGame)
  const tableData = useLeaderboardTableData({
    count: 10,
    fetchPlayerRecentPosition: true,
    showCTARow: false,
  })

  return (
    <div
      ref={ref}
      className={twJoin(
        'fixed inset-0 z-100 flex flex-col items-center justify-center gap-6 bg-black/95 px-4 pb-12 transition-opacity duration-300 ease-out',
        transitionStatus === 'entering' && 'opacity-0',
        transitionStatus === 'entered' && 'opacity-100',
        transitionStatus === 'exiting' && 'opacity-0',
      )}>
      {/* Table needs to be kept simple (e.g no access to the game store from within it otherwise it breaks in CTAELEMENTs) */}
      <LeaderboardTable {...tableData} onStartSpeedRun={startSpeedRun} />

      <div className="flex gap-4">
        <Button color="light" variant="primary" onClick={startSpeedRun}>
          Retry
        </Button>
        <Button
          color="light"
          variant="secondary"
          onClick={() => resetGame({ mode: GameMode.MAIN })}>
          Finish
        </Button>
      </div>
    </div>
  )
}
