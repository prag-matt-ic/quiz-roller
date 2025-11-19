'use client'
import { type FC, useCallback, useEffect, useRef } from 'react'

import { useSpeedRunTime, useTime } from '@/hooks/useTime'
import { useGameStore } from '../GameProvider'

type Props = Record<string, never>

const AVERAGE_WEB_TIME = '00:53'

const pad = (value: number) => value.toString().padStart(2, '0')
const formatRegularTime = (elapsedSeconds: number) => {
  const totalSeconds = Math.floor(elapsedSeconds)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${pad(minutes)}:${pad(seconds)}`
}

const formatSpeedRunTime = (elapsedSeconds: number) => {
  const totalSeconds = Math.floor(elapsedSeconds)
  const hundredths = Math.floor((elapsedSeconds - totalSeconds) * 100)
  return `${totalSeconds}.${hundredths.toString().padStart(2, '0')}`
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

  const updateTotalTime = useCallback(
    (elapsedSeconds: number) => {
      if (isSpeedRunMode || !elementRef.current) return
      elementRef.current.textContent = formatRegularTime(elapsedSeconds)
    },
    [isSpeedRunMode],
  )

  const updateSpeedRunTime = useCallback(
    (elapsedSeconds: number) => {
      if (!isSpeedRunMode || !elementRef.current) return
      elementRef.current.textContent = formatSpeedRunTime(elapsedSeconds)
    },
    [isSpeedRunMode],
  )

  const { totalTime } = useTime(updateTotalTime)
  const { speedRunTime } = useSpeedRunTime(updateSpeedRunTime)

  useEffect(() => {
    const seconds = isSpeedRunMode ? speedRunTime.current : totalTime.current
    if (!elementRef.current) return
    elementRef.current.textContent = activeFormat(seconds)
  }, [isSpeedRunMode, activeFormat, speedRunTime, totalTime])

  return (
    <div aria-live="polite" ref={elementRef} className={className}>
      {activeFormat(isSpeedRunMode ? speedRunTime.current : totalTime.current)}
    </div>
  )
}
