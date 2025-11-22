'use client'
import { type FC, useEffect, useState, useMemo } from 'react'
import { twJoin } from 'tailwind-merge'

import { getSpeedrunData } from '@/app/actions'
import type { SpeedRunDatabase } from '@/model/schema'
import { useGameStore } from '@/components/GameProvider'
import { Trophy } from 'lucide-react'

type Props = {
  count?: number
}

export const SpeedrunLeaderboard: FC<Props> = ({ count = 10 }) => {
  const [speedruns, setSpeedruns] = useState<SpeedRunDatabase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const completedSpeedruns = useGameStore((s) => s.completedSpeedRuns)
  const completedSpeedrunIds = useMemo(
    () => completedSpeedruns.map((run) => run.id),
    [completedSpeedruns],
  )

  useEffect(() => {
    let isMounted = true

    getSpeedrunData(count).then((data) => {
      if (isMounted) {
        setSpeedruns(data)
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
    }
  }, [count])

  if (isLoading) {
    return <div className="w-full text-center">Loading...</div>
  }

  // TODO: create a skeleton loader for the leaderboard rows - same grid but with animated placeholders
  return (
    <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 p-4 pb-12">
      <section className="w-full max-w-xl">
        <header className="flex w-full items-center justify-between px-3 py-5">
          <Trophy className="text-leaderboard" strokeWidth={1.5} />
          <h1 className="text-center text-2xl uppercase">Global Leaderboard</h1>
          <Trophy className="text-leaderboard" strokeWidth={1.5} />
        </header>
        <div className="grid grid-cols-[auto_2fr_1fr_0.5fr] rounded bg-black shadow-2xl shadow-[#000]">
          {/* Rows */}
          {speedruns.map((entry, index) => {
            const isCurrentUser = completedSpeedrunIds.includes(entry.id)
            // Username isnt unique so we should just match by records we know they own.
            // const isCurrentUsername = username && entry.username === username
            const isTopThree = index < 3
            return (
              <div
                key={entry.id}
                className={twJoin(
                  'col-span-full grid grid-cols-subgrid items-center border-b border-white/12 px-3 select-none last-of-type:border-0',
                  isCurrentUser ? 'text-leaderboard bg-leaderboard/8' : 'outline-white/30',
                  isTopThree ? 'h-14' : 'h-11',
                )}>
                {isTopThree ? (
                  <Medal position={index} />
                ) : (
                  <div className="flex w-full items-center justify-center pl-1 text-center">
                    {index + 1}.
                  </div>
                )}

                <h4
                  className={twJoin(
                    'flex items-center px-2 text-left uppercase',
                    isTopThree ? 'text-lg' : 'text-base',
                  )}>
                  {entry.username}
                </h4>
                <div className="flex items-center justify-center px-2 text-center font-mono text-xl tabular-nums">
                  {entry.time.toFixed(2)}s
                </div>
                <div className="flex items-center justify-center px-2 text-center text-2xl font-bold">
                  {entry.flag ?? '?'}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

const Medal: FC<{ position: number }> = ({ position }) => {
  const medalColours = ['text-gold', 'text-silver', 'text-bronze']

  return (
    <div className="relative ml-1.25 flex size-8 items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={twJoin('absolute inset-0', medalColours[position])}>
        <path
          d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15"
          stroke="currentColor"
        />
        <path d="M11 12 5.12 2.2" stroke="currentColor" />
        <path d="m13 12 5.88-9.8" stroke="currentColor" />
        <path d="M8 7h8" stroke="currentColor" />
        <circle cx="12" cy="17" r="6" fill="currentColor" />
      </svg>
      <p className="absolute top-3.25 text-sm font-bold text-black">{position + 1}</p>
    </div>
  )
}
