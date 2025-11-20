'use client'
import { type FC, useEffect, useState } from 'react'
import { getSpeedrunData } from '@/app/actions'

type SpeedrunEntry = {
  username: string
  time: number
  country: string | null
  flag: string | null
}

export const SpeedrunLeaderboard: FC = () => {
  const [speedruns, setSpeedruns] = useState<SpeedrunEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    getSpeedrunData().then((data) => {
      if (mounted) {
        setSpeedruns(data as SpeedrunEntry[])
        setLoading(false)
      }
    })

    return () => {
      mounted = false
    }
  }, [])

  if (loading) {
    return <div className="w-full text-center">Loading...</div>
  }

  return (
    <div className="absolute top-20 left-8 w-1/2 border-2 border-red-600 px-4 py-2">
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
          <>
            <div className="text-center font-semibold">{index + 1}</div>
            <div className="">{entry.username}</div>
            <div className="text-right tabular-nums">{entry.time.toFixed(2)}s</div>
            <div className="text-center">{entry.flag || '-'}</div>
            <div className="">{entry.country || '?'}</div>
            <div className="col-span-full h-px bg-gray-300" />
          </>
        ))}
      </div>
    </div>
  )
}
