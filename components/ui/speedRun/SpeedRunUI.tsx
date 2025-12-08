'use client'
import { RotateCcw, UploadCloud, X } from 'lucide-react'
import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { SpeedRunTimeDisplay } from '@/components/ui/SpeedRunTimeDisplay'
import { GameMode, SpeedRunStage } from '@/stores/types'

const SpeedRunTimer: FC = () => {
  const speedRunStatus = useGameStore((s) => s.speedRunStage)

  const isFinished =
    speedRunStatus === SpeedRunStage.SUBMITTING || speedRunStatus === SpeedRunStage.END
  if (isFinished) return null

  const isAmber =
    speedRunStatus === SpeedRunStage.START || speedRunStatus === SpeedRunStage.COUNTDOWN
  return (
    <div className="flex flex-col items-center gap-1.5 overflow-hidden">
      <div className="flex items-center gap-2">
        <div
          className={twJoin('size-2 rounded-full', isAmber ? 'bg-amber-400' : 'bg-emerald-500')}
        />
        <h2 className="text-xs tracking-wider text-white/60 uppercase">Speedroll</h2>
      </div>
      <SpeedRunTimeDisplay className="font-mono text-2xl leading-none font-semibold tracking-tight lg:text-4xl" />
    </div>
  )
}

export const SpeedRunControls: FC = () => {
  const speedRunStatus = useGameStore((s) => s.speedRunStage)
  const startCountdown = useGameStore((s) => s.startCountdown)
  const resetGame = useGameStore((s) => s.resetGame)
  const finishSpeedRun = useGameStore((s) => s.finishSpeedRun)

  const showSpeedRunButtons = speedRunStatus === SpeedRunStage.RUNNING

  return (
    <div className="pointer-events-auto flex size-fit items-center justify-center gap-4">
      {showSpeedRunButtons && (
        <Button
          size="sm"
          title="Cancel"
          className="aspect-square!"
          onClick={() => {
            resetGame({ mode: GameMode.LEARN })
          }}>
          <X size={24} strokeWidth={2} />
        </Button>
      )}

      <SpeedRunTimer />

      {showSpeedRunButtons && (
        <Button size="sm" onClick={startCountdown} title="Restart" className="aspect-square!">
          <RotateCcw size={24} strokeWidth={2} />
        </Button>
      )}

      {process.env.NODE_ENV === 'development' && showSpeedRunButtons && (
        <Button
          size="sm"
          onClick={finishSpeedRun}
          title="Finish Speedrun (Dev Only)"
          className="aspect-square!">
          <UploadCloud size={24} strokeWidth={2} />
        </Button>
      )}
    </div>
  )
}
