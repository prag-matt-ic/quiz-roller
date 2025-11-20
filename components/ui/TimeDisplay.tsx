'use client'
import { type FC, useCallback, useEffect, useRef } from 'react'

import { useSpeedRunTime, useTime } from '@/hooks/useTime'

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

const CTATimeDisplay: FC<Props> = () => {
  return (
    <section className="flex flex-col items-center justify-center text-center">
      <p className="text-4xl">Your time here:</p>
      <TotalTimeDisplay className="text-7xl font-bold" />
      <p className="text-xl">Average time spent on a web page: </p>
      <p className="text-4xl">{AVERAGE_WEB_TIME}</p>
    </section>
  )
}

export default CTATimeDisplay

type TimeDisplayBaseProps = {
  className?: string
}

export const TotalTimeDisplay: FC<TimeDisplayBaseProps> = ({ className }) => {
  const container = useRef<HTMLDivElement | null>(null)

  const { totalTime } = useTime((elapsedSeconds: number) => {
    if (!container.current) return
    container.current.textContent = formatRegularTime(elapsedSeconds)
  })

  return (
    <div aria-live="polite" ref={container} className={className}>
      {formatRegularTime(totalTime.current)}
    </div>
  )
}

export const SpeedRunTimeDisplay: FC<TimeDisplayBaseProps> = ({ className }) => {
  const container = useRef<HTMLDivElement | null>(null)

  const { speedRunTime } = useSpeedRunTime((elapsedSeconds: number) => {
    if (!container.current) return
    container.current.textContent = formatSpeedRunTime(elapsedSeconds)
  })

  return (
    <div aria-live="polite" ref={container} className={className}>
      {formatSpeedRunTime(speedRunTime.current)}
    </div>
  )
}
