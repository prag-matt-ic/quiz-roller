'use client'

import { Compass, Gamepad2, Timer } from 'lucide-react'
import { type FC } from 'react'
import { twJoin, twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Panel from '@/components/ui/dashboard/panel/Panel'
import { PanelHeader } from '@/components/ui/dashboard/panel/PanelHeader'
import { GameMode } from '@/stores/types'

type Props = {
  className?: string
  onClose?: () => void
}

const GAME_MODES = [
  {
    id: GameMode.MAIN,
    icon: Compass,
    label: 'Explore',
    desc: 'Free roam adventure',
    details:
      'Take your time discovering every corner of the world. No timers, no pressure. Find hidden paths, collect rings at your own pace, and uncover all the secrets the game has to offer.',
  },
  {
    id: GameMode.SPEEDRUN,
    icon: Timer,
    label: 'Speedrun',
    desc: 'Race against time',
    details:
      'Put your skills to the test with timed challenges. Complete stages as fast as possible, master shortcuts, and compete for the best times. Every millisecond counts.',
  },
] as const

export const GameModePanel: FC<Props> = ({ className, onClose }) => {
  const mode = useGameStore((s) => s.mode)
  const resetGame = useGameStore((s) => s.resetGame)

  const handleModeChange = (nextMode: GameMode) => {
    if (nextMode !== mode) {
      resetGame({ mode: nextMode })
    }
    onClose?.()
  }

  return (
    <Panel className={twMerge('h-full space-y-4 p-4', className)}>
      <PanelHeader icon={Gamepad2} label="Mode" />

      <div className="flex h-[calc(100%-2rem)] flex-col gap-3">
        {GAME_MODES.map(({ id, icon: Icon, label, desc, details }) => {
          const isSelected = mode === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleModeChange(id)}
              className={twJoin(
                'flex flex-1 flex-col items-start rounded-2xl p-4 text-left transition-all',
                isSelected
                  ? 'bg-white/20 text-white shadow-lg shadow-white/5'
                  : 'bg-black/20 text-white/50 hover:bg-black/30 hover:text-white/70',
              )}>
              <div className="mb-2 flex items-center gap-2">
                <Icon className="size-6" />
                <span className="text-lg font-bold">{label}</span>
              </div>
              <span className="mb-1 text-sm font-medium opacity-80">{desc}</span>
              <span className="text-xs leading-relaxed opacity-60">{details}</span>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
