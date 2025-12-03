'use client'
import { type FC, useRef } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import usePlayerSpeed from '@/hooks/usePlayerSpeed'
import { PLAYER_SPEED_BASE, PLAYER_SPEED_MAX } from '@/stores/playerSlice'

const RingsUI: FC = () => {
  const collectedRings = useGameStore((s) => s.collectedRings)
  const totalRingsCount = useGameStore((s) => s.totalCounts.rings)
  const collectedRingCount = Object.keys(collectedRings).length

  return (
    <div className="pointer-events-auto flex h-fit items-center gap-3 p-2 text-sm lg:p-4">
      <div className="flex items-center gap-1">
        <div
          className={twJoin(
            'relative flex aspect-square size-8 items-center justify-center rounded-full border-[1.5px] border-amber-400 font-mono leading-none font-bold',
            collectedRingCount > 0 && 'text-amber-300',
          )}>
          {collectedRingCount}
        </div>
        <span className="font-mono font-medium tracking-wide">
          <span className="text-white/70">/</span>
          {totalRingsCount}
        </span>
      </div>

      <SpeedBoostBar />
    </div>
  )
}
export default RingsUI

const SpeedBoostBar: FC = () => {
  const barRef = useRef<HTMLDivElement | null>(null)

  const onPlayerSpeedChange = (speed: number) => {
    if (!barRef.current) return
    const speedBoost = speed - PLAYER_SPEED_BASE
    const maxBoost = PLAYER_SPEED_MAX - PLAYER_SPEED_BASE
    const progress = Math.min(1, Math.max(0, speedBoost / maxBoost))
    barRef.current.style.transform = `translate3d(${-100 + progress * 100}%, 0, 0)`
  }
  usePlayerSpeed(onPlayerSpeedChange)

  return (
    <div
      id="progress-bar"
      className="relative ml-2 h-2 w-20 overflow-hidden rounded-full bg-white/50">
      <div
        ref={barRef}
        className="bg-orange-accent absolute left-0 size-full transition-transform duration-100 ease-linear"
        style={{
          transform: 'translate3d(-100%, 0, 0)',
        }}
      />
    </div>
  )
}
