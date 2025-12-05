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
  count?: number
  showCTA?: boolean
  fetchPlayerRecentPosition?: boolean
}

export const LeaderboardPanel: FC<Props> = ({
  className,
  count = 3,
  showCTA = true,
  fetchPlayerRecentPosition = false,
}) => {
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const tableData = useLeaderboardTableData({
    count,
    fetchPlayerRecentPosition,
    showCTARow: showCTA,
  })
  const attractorClassName = 'bg-emerald-400/[0.125] bg-linear-70 from-white/10 to-transparent'

  return (
    <Panel
      className={twMerge('flex h-full flex-col lg:gap-3 p-3 lg:p-4', className)}
      attractorClassName={attractorClassName}>
      <PanelHeader icon={Trophy} label="Leaderboard" className="-mb-2 lg:mb-0"/>
      <LeaderboardTable
        {...tableData}
        onStartSpeedRun={startSpeedRun}
        showCTA={showCTA}
        className="p-3"
      />
    </Panel>
  )
}
