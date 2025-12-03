'use client'
import gsap from 'gsap'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import { type FC, useEffect, useRef } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import usePlayerSpeed from '@/hooks/usePlayerSpeed'
import { PLAYER_SPEED_BASE, PLAYER_SPEED_MAX } from '@/stores/playerSlice'

gsap.registerPlugin(DrawSVGPlugin)

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
        <SpeedBoostDial />
        {collectedRingCount}
      </div>
      <span className="font-mono tracking-wide">{totalRingsCount}</span>
    </div>
  )
}
export default RingsUI

const SpeedBoostDial: FC = () => {
  const pathRef = useRef<SVGPathElement | null>(null)

  const onPlayerSpeedChange = (speed: number) => {
    if (!pathRef.current) return
    const speedBoost = speed - PLAYER_SPEED_BASE
    const maxBoost = PLAYER_SPEED_MAX - PLAYER_SPEED_BASE
    const progress = Math.min(1, Math.max(0, speedBoost / maxBoost))

    const drawAmount = progress * 100
    gsap.set(pathRef.current, {
      drawSVG: `0% ${drawAmount}%`,
    })
  }

  useEffect(() => {
    if (pathRef.current) {
      gsap.set(pathRef.current, { drawSVG: '0% 0%' })
    }
  }, [])

  usePlayerSpeed(onPlayerSpeedChange)

  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute size-12.5">
      <g clipPath="url(#clip0_1259_7128)">
        <path
          d="M8.31278 30.9407C6.07514 28.703 4.55129 25.8521 3.93393 22.7484C3.31656 19.6447 3.63342 16.4276 4.84442 13.504C6.05542 10.5804 8.10618 8.08154 10.7374 6.32344C13.3686 4.56534 16.462 3.62695 19.6265 3.62695C22.791 3.62695 25.8844 4.56534 28.5156 6.32344C31.1468 8.08154 33.1976 10.5804 34.4086 13.504C35.6196 16.4276 35.9364 19.6447 35.3191 22.7484C34.7017 25.8521 33.1778 28.703 30.9402 30.9407"
          stroke="#ffffff4d"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          ref={pathRef}
          d="M8.31278 30.9407C6.07514 28.703 4.55129 25.8521 3.93393 22.7484C3.31656 19.6447 3.63342 16.4276 4.84442 13.504C6.05542 10.5804 8.10618 8.08154 10.7374 6.32344C13.3686 4.56534 16.462 3.62695 19.6265 3.62695C22.791 3.62695 25.8844 4.56534 28.5156 6.32344C31.1468 8.08154 33.1976 10.5804 34.4086 13.504C35.6196 16.4276 35.9364 19.6447 35.3191 22.7484C34.7017 25.8521 33.1778 28.703 30.9402 30.9407"
          stroke="#ffffff"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </g>
      <defs>
        <clipPath id="clip0_1259_7128">
          <rect width="40" height="40" fill="none" />
        </clipPath>
      </defs>
    </svg>
  )
}
