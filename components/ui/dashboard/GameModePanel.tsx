'use client'

import { Compass, Gamepad2, LucideIcon, Timer } from 'lucide-react'
import { type FC, type ReactNode } from 'react'
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
  Icon: LucideIcon
  label: string
  description: ReactNode
}

const CORE_GAME_MODES: GameModeInfo[] = [
  {
    mode: GameMode.MAIN,
    Icon: Compass,
    label: 'Explore',
    description: 'Learn the level and discover bonuses to unlock.',
  },
  {
    mode: GameMode.SPEEDRUN,
    Icon: Timer,
    label: 'Speedroll',
    description: 'Race against others to the finish line. Every millisecond counts.',
  },
] as const

const DEV_GAME_MODES: GameModeInfo[] = [
  ...CORE_GAME_MODES,
  {
    mode: GameMode.TEST,
    Icon: Gamepad2,
    label: 'Test',
    description: "If you aren't on the inside you shouldn't see this.",
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
        {GAME_MODES.map(({ mode: id, Icon, label, description: desc }) => {
          const isSelected = mode === id
          return (
            <button
              key={id}
              type="button"
              onClick={() => handleModeChange(id)}
              className={twJoin(
                'flex flex-1 flex-col items-start rounded-xl p-4 text-left text-white',
                isSelected
                  ? 'bg-amber-300/5 ring ring-amber-500'
                  : 'bg-white/5 opacity-70 hover:opacity-100',
              )}>
              <div className="mb-2 flex items-center gap-2.5">
                <Icon className="size-6" />
                <span className="text-lg font-bold">{label}</span>
              </div>
              <p className="text-base font-medium opacity-80">{desc}</p>
            </button>
          )
        })}
      </div>
    </Panel>
  )
}
