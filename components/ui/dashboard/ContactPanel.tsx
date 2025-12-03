'use client'

import { BugIcon, MailIcon } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import Button from '@/components/ui/Button'
import Panel from '@/components/ui/dashboard/panel/Panel'

type QuickActionsProps = {
  className?: string
}

export const ContactPanel: FC<QuickActionsProps> = ({ className }) => {
  return (
    <Panel className={twMerge('flex h-full gap-2 p-4', className)} strength={1}>
      <p className="flex-1">
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
        incididunt ut
      </p>

      <div className="flex flex-1 flex-col gap-3">
        <Button size="md" color="light" variant="secondary" className="" startIcon={BugIcon}>
          Report Bug
        </Button>
        <Button size="md" color="light" variant="secondary" className="" startIcon={MailIcon}>
          Contact Dev
        </Button>
      </div>
    </Panel>
  )
}
