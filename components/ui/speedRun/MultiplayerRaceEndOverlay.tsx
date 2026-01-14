'use client'
import { LogOutIcon, RotateCcwIcon, Trophy } from 'lucide-react'
import { type FC, type RefObject, useMemo } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { useWebRTC } from '@/components/WebRTCProvider'
import Button from '@/components/ui/Button'
import { PointerProvider } from '@/components/ui/PointerProvider'
import Panel from '@/components/ui/panel/Panel'
import useSignaling from '@/hooks/useSignaling'
import { GameMode } from '@/stores/types'
import { MultiplayerMessage } from '@/utils/multiplayer/messages'

type Props = {
  ref: RefObject<HTMLDivElement | null>
  transitionStatus: TransitionStatus
  isMobile: boolean
}

function formatTime(centiseconds: number): string {
  const totalSeconds = centiseconds / 100
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) {
    return `${minutes}:${seconds.toFixed(2).padStart(5, '0')}`
  }
  return `${seconds.toFixed(2)}s`
}

// Fullscreen overlay shown at the end of a multiplayer race
export const MultiplayerRaceEndOverlay: FC<Props> = ({ ref, transitionStatus, isMobile }) => {
  const startMultiplayerCountdown = useGameStore((s) => s.startMultiplayerCountdown)
  const resetGame = useGameStore((s) => s.resetGame)
  const localPlayerFinishedTimeCS = useGameStore((s) => s.localPlayerFinishedTimeCS)
  const remotePlayerFinishedTimeCS = useGameStore((s) => s.remotePlayerFinishedTimeCS)
  const remotePlayerLeft = useGameStore((s) => s.remotePlayerLeft)

  const { state: webrtcState, actions: webrtcActions } = useWebRTC()
  const { isHost, peers } = webrtcState

  const { leaveRoom } = useSignaling()

  const result = useMemo(() => {
    // Check if opponent left the race
    if (remotePlayerLeft) {
      return {
        winner: 'local',
        heading: 'Opponent Left',
        description: 'Your opponent has left multiplayer mode. Return to free roam!',
      }
    }

    if (localPlayerFinishedTimeCS === null || remotePlayerFinishedTimeCS === null) {
      return { winner: null, heading: 'Race Complete!', description: 'Calculating results...' }
    }

    const localWon = localPlayerFinishedTimeCS < remotePlayerFinishedTimeCS
    const tie = localPlayerFinishedTimeCS === remotePlayerFinishedTimeCS

    if (tie) {
      return {
        winner: 'tie',
        heading: "It's a Tie!",
        description: 'Incredible! You both crossed the finish line at the exact same time.',
      }
    }

    if (localWon) {
      return {
        winner: 'local',
        heading: '🏆 You Win!',
        description: 'Congratulations! You crossed the finish line first.',
      }
    }

    return {
      winner: 'remote',
      heading: 'You Lost',
      description: 'Better luck next time! Your opponent was faster this round.',
    }
  }, [localPlayerFinishedTimeCS, remotePlayerFinishedTimeCS, remotePlayerLeft])

  const handleRetry = () => {
    // Only host can start a new race
    if (isHost) {
      startMultiplayerCountdown(true)
    }
  }

  const handleLeave = () => {
    // Send PLAYER_LEFT message to opponent before disconnecting
    const localPeerId = webrtcState.localPeerId
    peers.forEach((_, peerId) => {
      webrtcActions.sendMessage(peerId, {
        type: MultiplayerMessage.PLAYER_LEFT,
        data: { peerId: localPeerId || '' },
      })
    })

    // Close individual peer connections
    peers.forEach((_, peerId) => {
      webrtcActions.closePeerConnection(peerId)
    })

    // Leave the room (but keep signaling connection alive)
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
            <h2 className="text-3xl font-bold lg:text-5xl">{result.heading}</h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/80 xl:text-lg">
              {result.description}
            </p>
          </Panel>

          <Panel strength={3} attractorClassName="bg-emerald-400/15">
            <div className="mb-4 flex items-center gap-2">
              <Trophy className="size-5 text-amber-400" />
              <h3 className="text-lg font-semibold">Race Results</h3>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
              <div
                className={twJoin(
                  'rounded-lg p-4',
                  result.winner === 'local' ? 'bg-amber-500/20' : 'bg-white/5',
                )}>
                <p className="mb-1 text-sm text-white/60">You</p>
                <p className="text-2xl font-bold">
                  {localPlayerFinishedTimeCS !== null
                    ? formatTime(localPlayerFinishedTimeCS)
                    : '--'}
                </p>
                {result.winner === 'local' && (
                  <span className="text-xs font-semibold text-amber-400">WINNER</span>
                )}
              </div>

              <div
                className={twJoin(
                  'rounded-lg p-4',
                  result.winner === 'remote' ? 'bg-amber-500/20' : 'bg-white/5',
                )}>
                <p className="mb-1 text-sm text-white/60">Opponent</p>
                <p className="text-2xl font-bold">
                  {remotePlayerFinishedTimeCS !== null
                    ? formatTime(remotePlayerFinishedTimeCS)
                    : '--'}
                </p>
                {result.winner === 'remote' && (
                  <span className="text-xs font-semibold text-amber-400">WINNER</span>
                )}
              </div>
            </div>
          </Panel>

          <Panel
            className="mx-auto flex w-fit items-center justify-center gap-3 rounded-full"
            strength={3}>
            {!remotePlayerLeft && isHost && (
              <Button variant="primary" onClick={handleRetry} endIcon={RotateCcwIcon}>
                Race Again
              </Button>
            )}
            {!remotePlayerLeft && !isHost && (
              <p className="px-4 text-sm text-white/60">
                Waiting for host to start next race...
              </p>
            )}
            <Button size="md" variant="secondary" endIcon={LogOutIcon} onClick={handleLeave}>
              Leave
            </Button>
          </Panel>
        </section>
      </PointerProvider>
    </div>
  )
}
