'use client'

import { type FC, type RefObject } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { PointerProvider } from '@/components/ui/PointerProvider'
import { LeaderboardPanel } from '@/components/ui/dashboard/LeaderboardPanel'
import { SpeedPanel } from '@/components/ui/dashboard/RingsSpeedPanel'
import { SettingsPanel } from '@/components/ui/dashboard/SettingsPanel'
import { UsernamePanel } from '@/components/ui/dashboard/UsernamePanel'

type DashboardProps = {
  ref: RefObject<HTMLElement | null>
  isMobile: boolean
  transitionStatus: TransitionStatus
}

export const Dashboard: FC<DashboardProps> = ({ ref, isMobile, transitionStatus }) => {
  return (
    <PointerProvider isMobile={isMobile}>
      <aside
        ref={ref}
        className={twJoin(
          'fixed inset-0 z-200 flex items-center justify-center overflow-hidden p-4 transition-opacity duration-200',
          'bg-black/35 backdrop-blur-lg',
          transitionStatus === 'entered' && 'opacity-100',
          transitionStatus === 'exiting' && 'opacity-0',
          transitionStatus === 'exited' && 'opacity-0',
        )}>
        <div className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 gap-2 xl:grid-cols-2 xl:gap-3">
          <UsernamePanel />
          <LeaderboardPanel className="row-span-3" count={10} />
          <SpeedPanel />
          <SettingsPanel />
        </div>
      </aside>
    </PointerProvider>
  )
}
