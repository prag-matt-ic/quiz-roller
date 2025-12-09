'use client'
import { RotateCcw, UploadCloud, X } from 'lucide-react'
import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Button from '@/components/ui/Button'
import { SpeedRunTimeDisplay } from '@/components/ui/SpeedRunTimeDisplay'
import { GameMode, SpeedRunStage } from '@/stores/types'

export const SpeedRunTimer: FC = () => {
  const speedRunStatus = useGameStore((s) => s.speedRunStage)

  const isFinished =
    speedRunStatus === SpeedRunStage.SUBMITTING || speedRunStatus === SpeedRunStage.END
  if (isFinished) return null

  const isAmber =
    speedRunStatus === SpeedRunStage.START || speedRunStatus === SpeedRunStage.COUNTDOWN
  return (
    <div className="flex items-center gap-2">
      <div
        className={twJoin('size-2.5 rounded-full', isAmber ? 'bg-amber-400' : 'bg-emerald-500')}
      />
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
    <div className="pointer-events-auto flex size-fit items-center justify-center gap-2.5">
      <Button
        size="sm"
        variant="secondary"
        title="Cancel"
        className="aspect-square!"
        onClick={() => {
          resetGame({ mode: GameMode.LEARN })
        }}>
        <X size={20} strokeWidth={2} />
      </Button>

      <Button
        variant="secondary"
        size="sm"
        onClick={startCountdown}
        title="Restart"
        className="aspect-square!">
        <RotateCcw size={20} strokeWidth={2} />
      </Button>

      {process.env.NODE_ENV === 'development' && (
        <Button
          variant="secondary"
          size="sm"
          onClick={finishSpeedRun}
          title="Finish Speedrun (Dev Only)"
          className="aspect-square!">
          <UploadCloud size={20} strokeWidth={2} />
        </Button>
      )}

      <SpeedRunTimer />
    </div>
  )
}
