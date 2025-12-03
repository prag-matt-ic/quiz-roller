'use client'

import { Circle } from 'lucide-react'
import { type FC, useMemo } from 'react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Panel from '@/components/ui/dashboard/panel/Panel'
import { PanelHeader } from '@/components/ui/dashboard/panel/PanelHeader'

type RingsPanelProps = {
  className?: string
}

export const RingsPanel: FC<RingsPanelProps> = ({ className }) => {
  const collectedRings = useGameStore((s) => s.collectedRings)
  const totalRingsCount = useGameStore((s) => s.totalCounts.rings)

  const collectedRingCount = useMemo(() => Object.keys(collectedRings).length, [collectedRings])

  const progress = totalRingsCount > 0 ? (collectedRingCount / totalRingsCount) * 100 : 0

  return (
    <Panel
      className={twMerge('h-full p-4', className)}
      attractorClassName="bg-amber-400/[0.125] bg-linear-70 from-white/10 to-transparent">
      <div className="flex h-full flex-col justify-between">
        <PanelHeader icon={Circle} label="Rings" iconClassName="text-amber-400" />

        <div>
          <div className="mb-2 text-3xl font-bold text-white">
            {collectedRingCount}
            <span className="text-lg text-white/40">/{totalRingsCount}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-amber-200/30">
            <div
              className="h-full rounded-full bg-linear-to-r from-amber-500 to-amber-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Panel>
  )
}
