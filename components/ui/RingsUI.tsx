'use client'

import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import SpeedBoostDial from '@/components/ui/SpeedBoostDial'

const RingsUI: FC = () => {
  const collectedRings = useGameStore((s) => s.collectedRings)
  // const totalRingsCount = useGameStore((s) => s.totalCounts.rings)
  const collectedRingCount = Object.keys(collectedRings).length

  return (
    <div
      className={twJoin(
        'relative flex items-center justify-center place-self-center',
        collectedRingCount > 0 ? 'text-amber-300' : 'text-white/50',
      )}>
      <SpeedBoostDial className="size-14 xl:size-16" />
      <span className="absolute text-center font-mono text-sm leading-none font-bold tracking-wide xl:text-base">
        {collectedRingCount}
      </span>
    </div>
  )
}
export default RingsUI
