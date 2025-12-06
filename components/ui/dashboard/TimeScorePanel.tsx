'use client'

import { Info } from 'lucide-react'
import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import Panel from '@/components/ui/panel/Panel'
import { PanelHeader } from '@/components/ui/panel/PanelHeader'

import { SpeedRunTimeDisplay } from '../SpeedRunTimeDisplay'

type AboutPanelProps = {
  className?: string
}

export const TimeScorePanel: FC<AboutPanelProps> = ({ className }) => {
  return (
    <Panel className={twJoin('flex h-full flex-col justify-between gap-3 p-4', className)}>
      <PanelHeader icon={Info} label="Speedrun Time" />
      <SpeedRunTimeDisplay className="text-3xl font-semibold lg:text-5xl" />
    </Panel>
  )
}

export default TimeScorePanel
