'use client'

import { Trophy } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Panel from '@/components/ui/panel/Panel'
import { PanelHeader } from '@/components/ui/panel/PanelHeader'
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
  const startSpeedRun = useGameStore((s) => s.startCountdown)
  const tableData = useLeaderboardTableData({
    count,
    fetchPlayerRecentPosition,
    showCTARow: showCTA,
  })

  return (
    <Panel strength={3} className={className} attractorClassName="bg-emerald-400/15">
      <PanelHeader icon={Trophy} label="Leaderboard" className="" />
      <LeaderboardTable {...tableData} onStartSpeedRun={startSpeedRun} showCTA={showCTA} />
    </Panel>
  )
}
