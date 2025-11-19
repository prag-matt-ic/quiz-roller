'use client'
import { type FC } from 'react'
import { useGameStore } from '@/components/GameProvider'

type Props = {}

const TimeDisplay: FC<Props> = ({}) => {
  const timeElapsed = useGameStore((s) => s.timeElapsed)
  const minutes = Math.floor(timeElapsed / 60)
  const seconds = timeElapsed % 60
  const formatTime = (n: number) => n.toString().padStart(2, '0')

  return (
    <section className="flex flex-col items-center justify-center text-center">
      <p className="text-4xl">Your time here:</p>
      <h3 className="text-7xl font-bold">
        {formatTime(minutes)}:{formatTime(seconds)}
      </h3>
      <p className="text-xl">Average time spent on a web page: </p>
      <p className="text-4xl">00:53</p>
    </section>
  )
}

export default TimeDisplay
