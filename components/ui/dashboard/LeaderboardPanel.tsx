'use client'

import { Timer, Trophy } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import Panel from '@/components/ui/dashboard/panel/Panel'
import { PanelHeader } from '@/components/ui/dashboard/panel/PanelHeader'
import {
  LeaderboardTable,
  useLeaderboardTableData,
} from '@/components/ui/speedRun/LeaderboardTable'

type LeaderboardProps = {
  className?: string
}

export const LeaderboardPanel: FC<LeaderboardProps> = ({ className }) => {
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const tableData = useLeaderboardTableData(3, true)

  return (
    <Panel className={twMerge('flex h-full flex-col p-4', className)}>
      <PanelHeader icon={Trophy} label="Speedroll Leaderboard" className="mb-3">
        <Button
          color="light"
          variant="secondary"
          size="sm"
          onClick={startSpeedRun}
          startIcon={Timer}>
          Set a time
        </Button>
      </PanelHeader>

      <div className="flex flex-1 items-start justify-center overflow-hidden rounded-xl bg-black/30 p-3">
        <LeaderboardTable {...tableData} onStartSpeedRun={startSpeedRun} />
      </div>
    </Panel>
  )
}
