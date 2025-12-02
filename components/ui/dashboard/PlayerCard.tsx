'use client'

import { type ChangeEvent, type FC, useCallback } from 'react'
import { User } from 'lucide-react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Surface from '@/components/ui/surface/Surface'
import { Input } from '@/components/ui/input'

import { PANEL_BASE_CLASSES, PANEL_VARIANTS } from './panelStyles'

type PlayerCardProps = {
  className?: string
}

export const PlayerCard: FC<PlayerCardProps> = ({ className }) => {
  const username = useGameStore((s) => s.username)
  const setUsername = useGameStore((s) => s.setUsername)

  const handleUsernameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setUsername(event.target.value)
    },
    [setUsername],
  )

  return (
    <Surface
      className={twMerge(
        PANEL_BASE_CLASSES,
        PANEL_VARIANTS.accent,
        'flex h-full items-center gap-4',
        className,
      )}>
      <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-white/20 to-white/5 ring-2 ring-white/20">
        <User className="size-7 text-white/70" />
      </div>
      <Input
        value={username ?? ''}
        onChange={handleUsernameChange}
        placeholder="Enter username..."
        className="flex-1 border-white/10 bg-black/30 text-xl text-white placeholder:text-white/40 focus:border-white/30"
      />
    </Surface>
  )
}
