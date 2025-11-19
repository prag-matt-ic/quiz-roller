'use client'
import { type FC } from 'react'

type TimeDisplayProps = {
  finalTimeValue: number
}

const TimeDisplay: FC<TimeDisplayProps> = ({
  finalTimeValue,
}) => {

  const totalSeconds = Math.floor(finalTimeValue / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
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
