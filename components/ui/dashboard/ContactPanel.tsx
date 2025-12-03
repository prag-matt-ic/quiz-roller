'use client'

import { Bug, Mail } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import Panel from '@/components/ui/dashboard/panel/Panel'

type QuickActionsProps = {
  className?: string
}

export const ContactPanel: FC<QuickActionsProps> = ({ className }) => {
  return (
    <Panel className={twMerge('flex h-full flex-col gap-2 p-4', className)} strength={1}>
      <button className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm text-white/70 transition-all hover:bg-white/20 hover:text-white">
        <Bug className="size-4" />
        Report Bug
      </button>
      <button className="flex items-center justify-center gap-2 rounded-xl bg-white/10 py-2.5 text-sm text-white/70 transition-all hover:bg-white/20 hover:text-white">
        <Mail className="size-4" />
        Contact Dev
      </button>
    </Panel>
  )
}
