'use client'
import { type FC, Fragment, useEffect, useState } from 'react'
import { getSpeedrunData } from '@/app/actions'
import type { SpeedRunDatabase } from '@/model/schema'

export const SpeedrunLeaderboard: FC = () => {
  const [speedruns, setSpeedruns] = useState<SpeedRunDatabase[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    getSpeedrunData().then((data) => {
      if (mounted) {
        setSpeedruns(data)
        setIsLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  if (isLoading) {
    return <div className="w-full text-center">Loading...</div>
  }

  // TODO: highlight the current user's entries if present
  // TODO: create a skeleton loader for the leaderboard - same grid but with animated placeholders
  return (
    <div className="fixed top-32 left-0 w-sm max-w-full border-2 border-red-600">
      <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-2">
        {/* Header */}
        <div className="text-center font-bold">#</div>
        <div className="font-bold">Username</div>
        <div className="text-right font-bold">Time</div>
        <div className="text-center font-bold">Flag</div>
        <div className="font-bold">Country</div>
        <div className="col-span-5 h-px bg-gray-300" />

        {/* Rows */}
        {speedruns.map((entry, index) => (
          <Fragment key={index}>
            <div className="text-center font-semibold">{index + 1}</div>
            <div className="">{entry.username}</div>
            <div className="text-right tabular-nums">{entry.time.toFixed(2)}s</div>
            <div className="text-center">{entry.flag || '-'}</div>
            <div className="">{entry.country || '?'}</div>
            <div className="col-span-full h-px bg-gray-300/20" />
          </Fragment>
        ))}
      </div>
    </div>
  )
}
