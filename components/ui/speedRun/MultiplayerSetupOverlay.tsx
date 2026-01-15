'use client'
import { type FC, type Ref } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { PointerProvider } from '@/components/ui/PointerProvider'
import MultiplayerSetup from '@/components/ui/speedRun/MultiplayerSetup'
import { Overlay } from '@/stores/types'

type Props = {
  ref: Ref<HTMLDivElement>
  transitionStatus: TransitionStatus
}

/**
 * MultiplayerSetupOverlay
 * 
 * A fullscreen overlay that shows when a user joins via a room link.
 * Displays after the landing overlay and uses MultiplayerSetup component
 * to join the multiplayer room.
 */
export const MultiplayerSetupOverlay: FC<Props> = ({ ref, transitionStatus }) => {
  const isMobile = useGameStore((s) => s.isMobile)
  const setOverlay = useGameStore((s) => s.setOverlay)

  const handleBack = () => {
    setOverlay(Overlay.NONE)
  }

  return (
    <PointerProvider isMobile={isMobile}>
      <div
        ref={ref}
        className={twJoin(
          'fixed inset-0 z-500 flex size-full items-center justify-center transition-opacity ease-out',
          transitionStatus === 'entering' && 'opacity-100 duration-300',
          transitionStatus === 'entered' && 'opacity-100',
          transitionStatus === 'exiting' && 'opacity-0 duration-500',
          transitionStatus === 'exited' && 'opacity-0',
        )}>
        <section className="flex max-h-full w-full max-w-xl flex-col gap-4 overflow-y-auto px-6 py-4 xl:gap-6">
          <h2 className="font-unbounded text-center text-2xl font-semibold lg:text-3xl">
            Join Multiplayer Race
          </h2>

          <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
            <MultiplayerSetup onBack={handleBack} />
          </div>
        </section>
      </div>
    </PointerProvider>
  )
}
