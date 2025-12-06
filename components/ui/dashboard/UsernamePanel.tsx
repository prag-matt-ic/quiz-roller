'use client'

import { AlertTriangle, CheckCircle, UserIcon } from 'lucide-react'
import { type FC } from 'react'
import { twMerge } from 'tailwind-merge'

import { Input, useUsernameInput } from '@/components/ui/input/UsernameInput'
import Panel from '@/components/ui/panel/Panel'

type Props = {
  className?: string
}

export const UsernamePanel: FC<Props> = ({ className }) => {
  const inputProps = useUsernameInput()

  return (
    <Panel className={twMerge('flex h-full items-center gap-4', className)} strength={1}>
      <UserIcon className="size-6 text-white/70" />
      <Input
        {...inputProps}
        className="flex-1"
        endAdornment={
          inputProps.isValid ? (
            <CheckCircle className="size-6 text-emerald-400" />
          ) : (
            <AlertTriangle className="size-6 text-amber-600" />
          )
        }
      />
    </Panel>
  )
}
