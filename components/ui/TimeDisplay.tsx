'use client'
import { type FC, type HTMLAttributes, Ref, useCallback, useRef } from 'react'

import { useTime } from '@/hooks/useTime'
import { useGameStore } from '../GameProvider'

type Props = Record<string, never>

const AVERAGE_WEB_TIME = '00:53'

const pad = (value: number) => value.toString().padStart(2, '0')
const formatRegularTime = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${pad(minutes)}:${pad(seconds)}`
}

const formatSpeedRunTime = (elapsedMs: number) => {
  const totalSeconds = Math.floor(elapsedMs / 1000)
  const ms = elapsedMs % 1000
  const tenths = Math.floor(ms / 100)
  return `${totalSeconds}.${tenths}`
}

const TimeDisplay: FC<Props> = () => {
  return (
    <section className="flex flex-col items-center justify-center text-center">
      <p className="text-4xl">Your time here:</p>
      <LiveTimeDisplay className="text-7xl font-bold" />
      <p className="text-xl">Average time spent on a web page: </p>
      <p className="text-4xl">{AVERAGE_WEB_TIME}</p>
    </section>
  )
}

export default TimeDisplay

type LiveTimeDisplayProps = {
  className?: string
}

// Imperatively updates a DOM node whenever the elapsed time changes to avoid extra renders.
export const LiveTimeDisplay: FC<LiveTimeDisplayProps> = ({ className }) => {
  const isSpeedRunMode = useGameStore((s) => s.isSpeedRunMode)
  const activeFormat = isSpeedRunMode ? formatSpeedRunTime : formatRegularTime
  const elementRef = useRef<HTMLDivElement | null>(null)

  const handleTimeChange = useCallback(
    (elapsedMs: number) => {
      if (!elementRef.current) return
      elementRef.current.textContent = activeFormat(elapsedMs)
    },
    [activeFormat],
  )

  const { timeElapsed } = useTime(handleTimeChange)

  return (
    <div aria-live="polite" ref={elementRef} className={className}>
      {activeFormat(timeElapsed.current)}
    </div>
  )
}
