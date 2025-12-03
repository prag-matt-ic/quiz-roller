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
    <div className="pointer-events-auto m-2 flex items-center gap-3 p-2 text-sm lg:p-4">
      <div
        className={twJoin(
          'relative flex aspect-square size-9 items-center justify-center rounded-full border-2 border-amber-400 bg-black/20 font-mono leading-none font-bold tracking-wide',
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
