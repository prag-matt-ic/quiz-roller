'use client'

import { Trophy } from 'lucide-react'
import { type FC } from 'react'

import { useGameStore } from '@/components/GameProvider'
import Panel from '@/components/ui/panel/Panel'
import { PanelHeader } from '@/components/ui/panel/PanelHeader'
import { LeaderboardTable } from '@/components/ui/speedRun/LeaderboardTable'

type Props = {
  className?: string
  count?: number
  showCTA?: boolean
  fetchLatestRun?: boolean
}

export const LeaderboardPanel: FC<Props> = ({
  className,
  count = 3,
  showCTA = true,
  fetchLatestRun = false,
}) => {
  const startCountdown = useGameStore((s) => s.startCountdown)

  return (
    <Panel strength={3} className={className} attractorClassName="bg-emerald-400/15">
      <PanelHeader icon={Trophy} label="Leaderboard" className="" />
      <LeaderboardTable
        count={count}
        fetchLatestRun={fetchLatestRun}
        startCountdown={startCountdown}
        showCTA={showCTA}
      />
    </Panel>
  )
}
