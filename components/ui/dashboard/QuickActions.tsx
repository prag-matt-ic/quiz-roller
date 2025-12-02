'use client'

import { Bug, Mail, Volume2, VolumeX } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import Surface from '@/components/ui/surface/Surface'

import { PANEL_BASE_CLASSES, PANEL_VARIANTS } from './panelStyles'

type QuickActionsProps = {
  className?: string
}

export const QuickActions: FC<QuickActionsProps> = ({ className }) => {
  return (
    <Surface className={twMerge(PANEL_BASE_CLASSES, PANEL_VARIANTS.dark, className)}>
      <div className="flex h-full flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium tracking-widest text-white/50 uppercase">
            Support
          </span>
        </div>
        <div className="flex flex-col gap-2">
          <button className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm text-white/70 transition-all hover:bg-white/20 hover:text-white">
            <Bug className="size-4" />
            Report Bug
          </button>
          <button className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm text-white/70 transition-all hover:bg-white/20 hover:text-white">
            <Mail className="size-4" />
            Contact Dev
          </button>
        </div>
      </div>
    </Surface>
  )
}
