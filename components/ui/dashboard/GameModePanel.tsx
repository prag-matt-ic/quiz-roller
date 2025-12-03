'use client'

import { Compass, Gamepad2, LucideIcon, Timer } from 'lucide-react'
import { type FC } from 'react'
import { twJoin, twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Panel from '@/components/ui/dashboard/panel/Panel'
import { PanelHeader } from '@/components/ui/dashboard/panel/PanelHeader'
import { GameMode } from '@/stores/types'

type Props = {
  className?: string
}

type GameModeInfo = {
  mode: GameMode
  icon: LucideIcon
  label: string
  desc: string
}

const CORE_GAME_MODES: GameModeInfo[] = [
  {
    mode: GameMode.MAIN,
    icon: Compass,
    label: 'Explore',
    desc: 'Discover every corner of the world.',
  },
  {
    mode: GameMode.SPEEDRUN,
    icon: Timer,
    label: 'Speedroll',
    desc: 'Race against others. Every millisecond counts.',
  },
] as const

const DEV_GAME_MODES: GameModeInfo[] = [
  ...CORE_GAME_MODES,
  {
    mode: GameMode.TEST,
    icon: Gamepad2,
    label: 'Test',
    desc: 'For development and testing purposes only.',
  },
] as const

const GAME_MODES: GameModeInfo[] =
  process.env.NODE_ENV === 'development' ? DEV_GAME_MODES : CORE_GAME_MODES

export const GameModePanel: FC<Props> = ({ className }) => {
  const mode = useGameStore((s) => s.mode)
  const resetGame = useGameStore((s) => s.resetGame)

  const handleModeChange = (nextMode: GameMode) => {
    if (nextMode === mode) return
    resetGame({ mode: nextMode })
  }

  return (
    <Panel className={twMerge('h-full space-y-4 p-4', className)}>
      <PanelHeader icon={Gamepad2} label="Mode" />

      <div className="flex flex-col gap-3">
        {GAME_MODES.map(({ mode: id, icon: Icon, label, desc }) => {
          const isSelected = mode === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleModeChange(id)}
              className={twJoin(
                'flex flex-1 flex-col items-start rounded-xl p-4 text-left',
                isSelected
                  ? 'bg-white/10 text-white ring ring-cyan-600'
                  : 'bg-white/5 opacity-70',
              )}>
              <div className="mb-2 flex items-center gap-2">
                <Icon className="size-6" />
                <span className="text-lg font-bold">{label}</span>
              </div>
              <p className="mb-1 text-sm font-medium opacity-80">{desc}</p>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
