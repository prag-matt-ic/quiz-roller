'use client'
import { WifiOffIcon } from 'lucide-react'
import { type FC, type RefObject } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { useWebRTC } from '@/components/WebRTCProvider'
import Button from '@/components/ui/Button'
import { PointerProvider } from '@/components/ui/PointerProvider'
import Panel from '@/components/ui/panel/Panel'
import useSignaling from '@/hooks/useSignaling'
import { GameMode } from '@/stores/types'

type Props = {
  ref: RefObject<HTMLDivElement | null>
  transitionStatus: TransitionStatus
  isMobile: boolean
}

// Overlay shown when opponent disconnects during an active multiplayer race
export const MultiplayerDisconnectOverlay: FC<Props> = ({
  ref,
  transitionStatus,
  isMobile,
}) => {
  const resetGame = useGameStore((s) => s.resetGame)
  const remotePlayerLeft = useGameStore((s) => s.remotePlayerLeft)

  const { actions: webrtcActions, state: webrtcState } = useWebRTC()
  const { peers } = webrtcState
  const { leaveRoom } = useSignaling()

  const handleBackToFreeRoam = () => {
    // Close peer connections
    peers.forEach((_, peerId) => {
      webrtcActions.closePeerConnection(peerId)
    })

    // Leave the room
    leaveRoom()

    // Reset game to free roam mode
    resetGame({ mode: GameMode.LEARN })
  }

  return (
    <div
      ref={ref}
      className={twJoin(
        'fixed inset-0 z-500 flex items-center justify-center overflow-hidden px-18 transition-opacity duration-200',
        transitionStatus === 'entering' && 'opacity-0',
        transitionStatus === 'entered' && 'opacity-100',
        transitionStatus === 'exiting' && 'opacity-0',
      )}>
      <PointerProvider isMobile={isMobile}>
        <section className="mx-auto grid max-h-full w-full max-w-xl grid-cols-1 gap-2 overflow-y-auto px-2 py-6">
          <Panel className="shrink-0 text-center" strength={3}>
            <div className="mb-4 flex items-center justify-center">
              <div className="rounded-full bg-red-500/20 p-4">
                <WifiOffIcon className="size-12 text-red-400" />
              </div>
            </div>
            <h2 className="text-3xl font-bold lg:text-5xl">
              {remotePlayerLeft ? 'Opponent Left' : 'Connection Lost'}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/80 xl:text-lg">
              {remotePlayerLeft
                ? 'Your opponent has left the race.'
                : 'The connection to your opponent was lost. The race has been cancelled.'}
            </p>
          </Panel>

          <Panel
            className="mx-auto flex w-fit items-center justify-center rounded-full"
            strength={3}>
            <Button variant="primary" onClick={handleBackToFreeRoam}>
              Back to Free Roam
            </Button>
          </Panel>
        </section>
      </PointerProvider>
    </div>
  )
}
