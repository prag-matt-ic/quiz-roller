'use client'

import { Info } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import Panel from '@/components/ui/dashboard/panel/Panel'
import { PanelHeader } from '@/components/ui/dashboard/panel/PanelHeader'

type AboutPanelProps = {
  className?: string
}

export const AboutPanel: FC<AboutPanelProps> = ({ className }) => {
  return (
    <Panel className={twMerge('flex h-full flex-col gap-3 p-4', className)}>
      <PanelHeader icon={Info} label="About Speedroller" />

      <p className="p-2 text-white lg:text-lg">
        Speedroller is a 3D roller where you weave past obstacles, collect bonuses, and then
        compete to set the fastest time.
      </p>
    </Panel>
  )
}

export default AboutPanel
