'use client'

import { Timer, Trophy } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import Surface from '@/components/ui/surface/Surface'
import {
  LeaderboardTable,
  useLeaderboardTableData,
} from '@/components/ui/speedRun/LeaderboardTable'

import { PANEL_BASE_CLASSES, PANEL_VARIANTS } from './panelStyles'

type LeaderboardProps = {
  className?: string
}

export const Leaderboard: FC<LeaderboardProps> = ({ className }) => {
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)
  const tableData = useLeaderboardTableData(3, true)

  return (
    <Surface
      className={twMerge(
        PANEL_BASE_CLASSES,
        PANEL_VARIANTS.dark,
        'flex h-full flex-col',
        className,
      )}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-white/50" />
          <span className="text-xs font-medium tracking-widest text-white/50 uppercase">
            Speedroll Leaderboard
          </span>
        </div>
        <Button
          color="light"
          variant="secondary"
          className="h-7 gap-1.5 px-3 text-xs"
          onClick={startSpeedRun}>
          <Timer className="h-3.5 w-3.5" />
          Set a time
        </Button>
      </div>

      <div className="flex flex-1 items-start justify-center overflow-hidden rounded-xl bg-black/30 p-3">
        <LeaderboardTable {...tableData} onStartSpeedRun={startSpeedRun} />
      </div>
    </Surface>
  )
}
