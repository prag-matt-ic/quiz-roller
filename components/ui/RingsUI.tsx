'use client'

import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import SpeedBoostDial from '@/components/ui/SpeedBoostDial'

const RingsUI: FC = () => {
  const collectedRings = useGameStore((s) => s.collectedRings)
  const totalRingsCount = useGameStore((s) => s.totalCounts.rings)
  const collectedRingCount = Object.keys(collectedRings).length

  return (
    <div className="pointer-events-auto flex items-center gap-3 text-sm">
      <div
        className={twJoin(
          'relative flex aspect-square size-9 items-center justify-center rounded-full bg-black/40 font-mono leading-none font-bold tracking-wide',
          collectedRingCount > 0 ? 'text-amber-300' : 'text-white/50',
        )}>
        <SpeedBoostDial className="absolute size-12.5" />
        {collectedRingCount}
      </div>
      <span className="font-mono tracking-wide">{totalRingsCount}</span>
    </div>
  )
}
export default RingsUI
