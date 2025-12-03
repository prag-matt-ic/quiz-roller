'use client'

import { XIcon } from 'lucide-react'
import { type FC, type RefObject, useRef, useState } from 'react'
import { SwitchTransition, Transition, type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { CollectiblesPanel } from '@/components/ui//dashboard/CollectiblesPanel'
import { ContactPanel } from '@/components/ui//dashboard/ContactPanel'
import { LeaderboardPanel } from '@/components/ui//dashboard/LeaderboardPanel'
import { PlayerPanel } from '@/components/ui//dashboard/PlayerPanel'
import { RingsPanel } from '@/components/ui//dashboard/RingsPanel'
import { PointerProvider } from '@/components/ui/PointerProvider'
import { SettingsPanel } from '@/components/ui/dashboard/SettingsPanel'
import { GameMode } from '@/stores/types'

import Button from '../Button'
import { AboutPanel } from './AboutPanel'
import { type DashboardTabId, ModeTabs } from './ModeTabs'
import { SpeedPanel } from './RingsSpeedPanel'

type DashboardProps = {
  ref: RefObject<HTMLElement | null>
  isMobile: boolean
  transitionStatus: TransitionStatus
  onClose: () => void
}

export const Dashboard: FC<DashboardProps> = ({ ref, isMobile, transitionStatus, onClose }) => {
  const mode = useGameStore((s) => s.mode)
  const [activeTab, setActiveTab] = useState<DashboardTabId>(() =>
    mode === GameMode.SPEEDRUN ? 'speedrun' : 'main',
  )

  const tabContentRef = useRef<HTMLDivElement | null>(null)

  const tabKey = activeTab === 'test' ? 'main' : activeTab

  return (
    <PointerProvider isMobile={isMobile}>
      <aside
        ref={ref}
        className={twJoin(
          'fixed inset-0 z-200 flex items-center justify-center overflow-y-auto px-6 py-10 transition-opacity duration-200 xl:py-16',
          'bg-black/50 backdrop-blur-lg',
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

        <Button
          type="button"
          size="md"
          onClick={onClose}
          className="fixed top-6 right-6 z-300 aspect-square">
          <XIcon className="size-5" />
        </Button>

        <div className="relative z-10 mx-auto grid h-full w-full max-w-6xl grid-cols-1 grid-rows-[auto_1fr] flex-col gap-2">
          <ModeTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <SwitchTransition>
            <Transition
              key={tabKey}
              timeout={{ enter: 0, exit: 0 }}
              nodeRef={tabContentRef}
              appear={true}
              mountOnEnter={true}
              unmountOnExit={true}>
              {(status) => (
                <div
                  ref={tabContentRef}
                  className={twJoin(
                    'grid h-fit auto-rows-[minmax(120px,auto)] grid-cols-2 gap-3 opacity-0 transition-opacity duration-0 md:grid-cols-4',
                    status === 'entering' && 'opacity-100',
                    status === 'entered' && 'opacity-100',
                  )}>
                  {tabKey === 'speedrun' ? (
                    <>
                      <PlayerPanel className="col-span-2 row-span-1" />
                      <LeaderboardPanel className="col-span-2 row-span-3" count={10} />
                      <SpeedPanel className="col-span-2 row-span-1" />
                      <SettingsPanel className="col-span-2 row-span-1" />
                    </>
                  ) : (
                    <>
                      <CollectiblesPanel className="col-span-1 row-span-1" />
                      <RingsPanel className="col-span-1 row-span-1" />
                      <AboutPanel className="col-span-2 row-span-1" />
                      <ContactPanel className="col-span-2 row-span-1" />
                      <SettingsPanel className="col-span-2 row-span-1" />
                    </>
                  )}
                </div>
              )}
            </Transition>
          </SwitchTransition>
        </div>
      </aside>
    </PointerProvider>
  )
}
