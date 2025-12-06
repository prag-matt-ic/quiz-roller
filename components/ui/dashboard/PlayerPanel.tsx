'use client'

import { User } from 'lucide-react'
import { type ChangeEvent, type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { Input } from '@/components/ui/input'
import Panel from '@/components/ui/panel/Panel'

type Props = {
  className?: string
}

export const PlayerPanel: FC<Props> = ({ className }) => {
  const username = useGameStore((s) => s.username)
  const setUsername = useGameStore((s) => s.setUsername)

  const onUsernameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUsername(event.target.value)
  }

  return (
    <Panel className={twMerge('flex h-full items-center gap-4 p-6', className)} strength={1}>
      <User className="size-6 text-white/70" />
      <Input
        value={username ?? ''}
        onChange={onUsernameChange}
        placeholder="Enter username..."
        className="flex-1 border-white/10 bg-black/30 text-xl text-white placeholder:text-white/40 focus:border-white/30"
      />
    </Panel>
  )
}
