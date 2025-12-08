'use client'

import { Circle } from 'lucide-react'
import { type FC } from 'react'

import SpeedBoostDial from '@/components/ui/SpeedBoostDial'
import Panel from '@/components/ui/panel/Panel'
import { PanelHeader } from '@/components/ui/panel/PanelHeader'

type RingsSpeedPanelProps = {
  className?: string
}

export const SpeedPanel: FC<RingsSpeedPanelProps> = ({ className }) => {
  return (
    <Panel strength={1} className={className} attractorClassName="bg-amber-400/15">
      <PanelHeader icon={Circle} label="Speed" iconClassName="text-amber-400" />
      <RingBoostInfo />
    </Panel>
  )
}

export default SpeedPanel

export const RingBoostInfo: FC = () => {
  return (
    <div className="flex w-fit max-w-xl items-center gap-4 rounded-xl border border-white/5 bg-white/3 p-3">
      <div className="relative flex size-20 items-center justify-center">
        <SpeedBoostDial className="size-18" progressOverride={0.5} strokeWidth={4} />
        <span className="pointer-events-none absolute text-[10px] tracking-[1px] text-white/70 uppercase">
          Boost
        </span>
      </div>
      <p className="text-sm leading-relaxed text-pretty text-white xl:text-base">
        Each ring gives you a temporary speed boost.
        <br />
        <span className="text-balance text-white/60">
          Plan your route to collect rings whilst keeping a tight line. Falling off resets your
          boost.
        </span>
      </p>
    </div>
  )
}
