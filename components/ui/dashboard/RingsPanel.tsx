'use client'

import { type FC, useMemo } from 'react'
import { Circle } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Surface from '@/components/ui/surface/Surface'

import { PANEL_BASE_CLASSES, PANEL_VARIANTS } from './panelStyles'

type RingsPanelProps = {
  className?: string
}

export const RingsPanel: FC<RingsPanelProps> = ({ className }) => {
  const collectedRings = useGameStore((s) => s.collectedRings)
  const totalRingsCount = useGameStore((s) => s.totalCounts.rings)

  const collectedRingCount = useMemo(
    () => Object.keys(collectedRings).length,
    [collectedRings],
  )

  const progress = totalRingsCount > 0 ? (collectedRingCount / totalRingsCount) * 100 : 0

  return (
    <Surface
      className={twMerge(PANEL_BASE_CLASSES, PANEL_VARIANTS.dark, className)}>
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center gap-2">
          <Circle className="size-4 text-amber-400" />
          <span className="text-xs font-medium uppercase tracking-widest text-white/50">
            Rings
          </span>
        </div>

        <div>
          <div className="mb-2 text-3xl font-bold text-white">
            {collectedRingCount}
            <span className="text-lg text-white/40">/{totalRingsCount}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-amber-200/30">
            <div
              className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </Surface>
  )
}
