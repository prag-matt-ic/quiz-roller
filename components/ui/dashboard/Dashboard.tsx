'use client'

import { XIcon } from 'lucide-react'
import { type FC, type RefObject } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { PointerProvider } from '../PointerProvider'
import { CollectiblesPanel } from './CollectiblesPanel'
import { ContactPanel } from './ContactPanel'
import { GameModePanel } from './GameModePanel'
import { LeaderboardPanel } from './Leaderboard'
import { PlayerPanel } from './PlayerCard'
import { RingsPanel } from './RingsPanel'
import { SettingsPanel } from './Settings'

type DashboardProps = {
  ref: RefObject<HTMLElement | null>
  isMobile: boolean
  transitionStatus: TransitionStatus
  onClose: () => void
}

export const Dashboard: FC<DashboardProps> = ({ ref, isMobile, transitionStatus, onClose }) => {
  return (
    <PointerProvider isMobile={isMobile}>
      <aside
        ref={ref}
        className={twJoin(
          'fixed inset-0 z-200 flex size-full items-start justify-center overflow-y-auto px-6 py-10 transition-opacity duration-200',
          'bg-radial from-[#000]/90 from-25% to-[#000]/0 to-100% backdrop-blur-sm',
          transitionStatus === 'entered' && 'opacity-100',
          transitionStatus === 'exiting' && 'opacity-0',
          transitionStatus === 'exited' && 'opacity-0',
        )}>
        {/* Backdrop to capture clicks and close the dashboard */}
        <div
          className="pointer-events-auto absolute inset-0 cursor-pointer"
          onClick={onClose}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-6">
          <div className="flex items-start justify-between">
            <h1 className="font-mono text-5xl font-black tracking-tight text-white md:text-6xl">
              Speedroller
            </h1>
            <button
              type="button"
              onClick={onClose}
              className="flex size-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:border-white/30 hover:bg-white/10">
              <XIcon className="size-5" />
            </button>
          </div>

          <div className="grid auto-rows-[minmax(120px,auto)] grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
            <GameModePanel className="col-span-2 row-span-2" />
            <PlayerPanel className="col-span-2 row-span-1" />
            <LeaderboardPanel className="col-span-2 row-span-1" />
            <SettingsPanel className="col-span-2 row-span-2" />
            <RingsPanel className="col-span-1 row-span-1" />
            <CollectiblesPanel className="col-span-1 row-span-1" />
            <ContactPanel className="col-span-1 row-span-1" />
          </div>
        </div>
      </aside>
    </PointerProvider>
  )
}
