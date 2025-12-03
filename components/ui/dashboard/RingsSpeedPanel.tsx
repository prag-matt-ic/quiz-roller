'use client'

import { Circle } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import SpeedBoostDial from '@/components/ui/SpeedBoostDial'
import Panel from '@/components/ui/dashboard/panel/Panel'
import { PanelHeader } from '@/components/ui/dashboard/panel/PanelHeader'

type RingsSpeedPanelProps = {
  className?: string
}

export const SpeedPanel: FC<RingsSpeedPanelProps> = ({ className }) => {
  return (
    <Panel
      className={twMerge('flex h-full flex-col gap-4 p-4', className)}
      attractorClassName="bg-amber-400/[0.125] bg-linear-70 from-white/10 to-transparent">
      <PanelHeader icon={Circle} label="Speed" iconClassName="text-amber-400" />

      <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/3 p-3">
        <div className="relative flex size-20 items-center justify-center">
          <SpeedBoostDial className="size-20" fixedProgress={0.2} />
          <span className="pointer-events-none absolute text-[10px] tracking-[2px] text-white/70 uppercase">
            Boost
          </span>
        </div>
        <p className="leading-relaxed text-pretty text-white">
          Each ring you collect gives you a temporary speed boost. Plan your route so you hit as
          many rings as possible while still keeping a tight line.
        </p>
      </div>
    </Panel>
  )
}

export default SpeedPanel
