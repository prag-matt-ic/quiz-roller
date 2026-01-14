'use client'
import { LogOutIcon, PlayIcon, RotateCcwIcon } from 'lucide-react'
import { type FC, type RefObject } from 'react'
import { type TransitionStatus } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { useWebRTC } from '@/components/WebRTCProvider'
import Button from '@/components/ui/Button'
import { PointerProvider } from '@/components/ui/PointerProvider'
import Panel from '@/components/ui/panel/Panel'
import useSignaling from '@/hooks/useSignaling'
import { GameMode, Overlay } from '@/stores/types'
import {
  type GameStartMessage,
  MultiplayerMessage,
  type RaceResumedMessage,
} from '@/utils/multiplayer/messages'

type Props = {
  ref: RefObject<HTMLDivElement | null>
  transitionStatus: TransitionStatus
  isMobile: boolean
}

// Fullscreen overlay shown when a player pauses the multiplayer race
export const MultiplayerGamePausedOverlay: FC<Props> = ({
  ref,
  transitionStatus,
  isMobile,
}) => {
  const setOverlay = useGameStore((s) => s.setOverlay)
  const resetGame = useGameStore((s) => s.resetGame)
  const resetMultiplayerRaceState = useGameStore((s) => s.resetMultiplayerRaceState)
  const setRacePaused = useGameStore((s) => s.setRacePaused)
  const pausedByPeerId = useGameStore((s) => s.pausedByPeerId)
  const startMultiplayerCountdown = useGameStore((s) => s.startMultiplayerCountdown)
  const remotePlayerLeft = useGameStore((s) => s.remotePlayerLeft)

  const { state: webrtcState, actions: webrtcActions } = useWebRTC()
  const { localPeerId, peers } = webrtcState

  const { leaveRoom } = useSignaling()

  const isPausedByMe = pausedByPeerId === localPeerId

  const handleResume = () => {
    // Only the person who paused can resume
    if (!isPausedByMe) return

    // Send RACE_RESUMED message to all peers
    const message: RaceResumedMessage = {
      type: MultiplayerMessage.RACE_RESUMED,
      data: { peerId: localPeerId || '' },
    }
    peers.forEach((_, peerId) => {
      webrtcActions.sendMessage(peerId, message)
    })

    // Resume locally
    setRacePaused(false, null)
    setOverlay(Overlay.NONE)
  }

  const handleRestartFromBeginning = () => {
    // Only the person who paused can restart
    if (!isPausedByMe) return

    // Unpause first
    setRacePaused(false, null)

    // Reset race state
    resetMultiplayerRaceState()

    // Send GAME_START message to all peers
    const message: GameStartMessage = {
      type: MultiplayerMessage.GAME_START,
      data: { startTime: Date.now() },
    }
    peers.forEach((_, peerId) => {
      webrtcActions.sendMessage(peerId, message)
    })

    // Start local countdown as host (right side)
    // The opponent will receive GAME_START and start as guest (left side)
    startMultiplayerCountdown(true)
  }

  const handleLeave = () => {
    // Send PLAYER_LEFT message to opponent before disconnecting
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

    // Unpause and reset game to free roam mode
    setRacePaused(false, null)
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
            <h2 className="text-3xl font-bold lg:text-5xl">
              {remotePlayerLeft
                ? 'Opponent Left'
                : isPausedByMe
                  ? 'Race Paused'
                  : 'Opponent Paused'}
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-white/80 xl:text-lg">
              {remotePlayerLeft
                ? 'Your opponent has left the race.'
                : isPausedByMe
                  ? 'Choose an option to continue or leave the race.'
                  : 'Your opponent has paused the race. Wait for them to resume or leave.'}
            </p>
          </Panel>

          {remotePlayerLeft ? (
            <>
              {/* Opponent has left - only show leave option */}
              <Panel strength={3} attractorClassName="bg-amber-400/15">
                <div className="grid gap-3">
                  <Button
                    onClick={handleLeave}
                    variant="secondary"
                    size="lg"
                    className="w-full text-red-400 hover:text-red-300">
                    <LogOutIcon className="size-5" />
                    Leave Race
                  </Button>
                </div>
              </Panel>
            </>
          ) : isPausedByMe ? (
            <>
              {/* Options for the player who paused */}
              <Panel strength={3} attractorClassName="bg-emerald-400/15">
                <div className="grid gap-3">
                  <Button onClick={handleResume} variant="primary" size="lg" className="w-full">
                    <PlayIcon className="size-5" />
                    Resume Race
                  </Button>

                  <Button
                    onClick={handleRestartFromBeginning}
                    variant="secondary"
                    size="lg"
                    className="w-full">
                    <RotateCcwIcon className="size-5" />
                    Restart
                  </Button>

                  <Button
                    onClick={handleLeave}
                    variant="secondary"
                    size="lg"
                    className="w-full text-red-400 hover:text-red-300">
                    <LogOutIcon className="size-5" />
                    Leave Race
                  </Button>
                </div>
              </Panel>
            </>
          ) : (
            <>
              {/* Options for the opponent who didn't pause */}
              <Panel strength={3} attractorClassName="bg-amber-400/15">
                <div className="mb-4 text-center">
                  <p className="text-sm text-white/60">
                    Waiting for opponent to resume or restart the race...
                  </p>
                </div>

                <div className="grid gap-3">
                  <Button
                    onClick={handleLeave}
                    variant="secondary"
                    size="lg"
                    className="w-full text-red-400 hover:text-red-300">
                    <LogOutIcon className="mr-2 size-5" />
                    Leave Race
                  </Button>
                </div>
              </Panel>
            </>
          )}
        </section>
      </PointerProvider>
    </div>
  )
}
