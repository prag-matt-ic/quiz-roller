'use client'
import { type FC } from 'react'

import { useGameStore } from '@/components/GameProvider'
import Button from '../Button'
import { LeaderboardTable, useLeaderboardTableData } from './LeaderboardTable'

type Props = {
  showButtons?: boolean
}

// Fullscreen overlay version of the table shown at the end of a speedrun in the UI.

export const LeaderboardOverlay: FC<Props> = ({ showButtons = true }) => {
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const stopSpeedRun = useGameStore((s) => s.stopSpeedRun)
  const tableData = useLeaderboardTableData(10)

  return (
    <div className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-6 bg-black/60 px-4 pb-12">
      {/* Table needs to be kept simple (e.g no access to the game store from within it otherwise it breaks in CTAELEMENTs) */}
      <LeaderboardTable {...tableData} />
      {showButtons && (
        <div className="flex gap-4">
          <Button color="light" variant="primary" onClick={startSpeedRun}>
            Retry
          </Button>
          <Button color="light" variant="secondary" onClick={stopSpeedRun}>
            Finish
          </Button>
        </div>
      )}
    </div>
  )
}
