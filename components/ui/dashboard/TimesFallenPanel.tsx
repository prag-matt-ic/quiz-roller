'use client'
import { SkullIcon } from 'lucide-react'
import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import Panel from '@/components/ui/panel/Panel'
import { PanelHeader } from '@/components/ui/panel/PanelHeader'

type Props = {
  className?: string
}

export const TimesFallenPanel: FC<Props> = ({ className }) => {
  const fallCount = useGameStore((s) => s.fallCount)

  return (
    <Panel
      className={twJoin('flex h-full flex-col justify-between gap-3 p-4', className)}
      attractorClassName="bg-red-500/[0.125] bg-linear-70 from-white/10 to-transparent">
      <PanelHeader icon={SkullIcon} label="Times Fallen" iconClassName="text-gray-200" />
      <p className="text-3xl font-bold text-red-300 lg:text-5xl">{fallCount}</p>
    </Panel>
  )
}
