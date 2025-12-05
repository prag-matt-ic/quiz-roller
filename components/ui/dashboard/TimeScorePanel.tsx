'use client'

import { Info } from 'lucide-react'
import { type FC } from 'react'
import { twJoin } from 'tailwind-merge'

import Panel from '@/components/ui/dashboard/panel/Panel'
import { PanelHeader } from '@/components/ui/dashboard/panel/PanelHeader'
import { SpeedRunTimeDisplay } from '../SpeedRunTimeDisplay'

type AboutPanelProps = {
  className?: string
}

export const TimeScorePanel: FC<AboutPanelProps> = ({ className }) => {
  return (
    <Panel className={twJoin('flex h-full flex-col gap-3 p-4 justify-between', className)}>
      <PanelHeader icon={Info} label="Speedrun Time" />
      <SpeedRunTimeDisplay className="text-3xl lg:text-5xl font-semibold"/>
    </Panel>
  )
}

export default TimeScorePanel
