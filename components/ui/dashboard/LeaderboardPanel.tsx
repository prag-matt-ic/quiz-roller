'use client'

import { Trophy } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Panel from '@/components/ui/dashboard/panel/Panel'
import { PanelHeader } from '@/components/ui/dashboard/panel/PanelHeader'
import {
  LeaderboardTable,
  useLeaderboardTableData,
} from '@/components/ui/speedRun/LeaderboardTable'

type Props = {
  className?: string
}

export const LeaderboardPanel: FC<Props> = ({ className }) => {
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const tableData = useLeaderboardTableData({
    count: 3,
    fetchPlayerRecentPosition: false,
    showCTARow: true,
  })

  return (
    <Panel className={twMerge('flex h-full flex-col gap-3 p-4', className)}>
      <PanelHeader icon={Trophy} label="Speedroll Leaderboard" />
      <LeaderboardTable {...tableData} onStartSpeedRun={startSpeedRun} className="p-3" />
    </Panel>
  )
}
