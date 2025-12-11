'use client'

import { type FC, type RefObject } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { PointerProvider } from '@/components/ui/PointerProvider'
import { DashboardLeaderboardPanel } from '@/components/ui/dashboard/LeaderboardPanel'
import { RingsPanel } from '@/components/ui/dashboard/RingsPanel'
import { SettingsPanel } from '@/components/ui/dashboard/SettingsPanel'
import { SpeedPanel } from '@/components/ui/dashboard/SpeedPanel'
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
          'fixed inset-0 z-200 flex items-center justify-center overflow-hidden px-18 transition-opacity duration-200',
          'bg-linear-0 from-black/30 via-black/80 to-black/30 backdrop-blur-md xl:backdrop-blur-lg',
          transitionStatus === 'entered' && 'opacity-100',
          transitionStatus === 'exiting' && 'opacity-0',
          transitionStatus === 'exited' && 'opacity-0',
        )}>
        <div className="mx-auto grid max-h-full w-full max-w-xl grid-cols-1 gap-2 overflow-y-auto px-2 py-6 xl:max-w-6xl xl:grid-cols-2 xl:gap-3">
          <UsernamePanel />
          <DashboardLeaderboardPanel className="row-span-3" />
          <div className="col-span-1 grid grid-cols-3 gap-2">
            <RingsPanel />
            <SpeedPanel className="col-span-2" />
          </div>
          <SettingsPanel />
        </div>
      </aside>
    </PointerProvider>
  )
}
