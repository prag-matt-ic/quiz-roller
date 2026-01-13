'use client'

import { Copy, Loader2, Users, Wifi, WifiOff } from 'lucide-react'
import { useSearchParams } from 'next/navigation'
import { type FC, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SwitchTransition, Transition } from 'react-transition-group'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { useWebRTC } from '@/components/WebRTCProvider'
import Button from '@/components/ui/Button'
import useSignaling from '@/hooks/useSignaling'
import { type GameStartMessage, MultiplayerMessage } from '@/utils/multiplayer/messages'
import { removeQueryParam, setQueryParam } from '@/utils/urlParams'

/** Generate a random room ID */
function generateRoomId(): string {
  const adjectives = [
    'swift',
    'brave',
    'clever',
    'mighty',
    'cosmic',
    'stellar',
    'rapid',
    'blazing',
  ]
  const nouns = ['falcon', 'tiger', 'dragon', 'phoenix', 'comet', 'rocket', 'thunder', 'vortex']
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)]
  const noun = nouns[Math.floor(Math.random() * nouns.length)]
  const num = Math.floor(Math.random() * 100)
  return `${adj}-${noun}-${num}`
}

type Props = {
  onBack: () => void
}

/**
 * MultiplayerSetup
 *
 * A self-contained component for setting up multiplayer races.
 * Handles room creation, sharing links, peer connection, and starting the race.
 */
const MultiplayerSetup: FC<Props> = ({ onBack }) => {
  const roomFromUrl = useSearchParams().get('room')
  const startMultiplayerCountdown = useGameStore((s) => s.startMultiplayerCountdown)

  // Local state
  const [roomIdInput, setRoomIdInput] = useState(() => roomFromUrl || generateRoomId())
  const [copied, setCopied] = useState(false)

  // Track whether we've attempted to auto-join from URL (ref to avoid lint issues with setState in effects)
  const autoJoinAttemptedRef = useRef(false)

  // nodeRefs (avoid findDOMNode)
  const idleRef = useRef<HTMLDivElement>(null)
  const waitingRef = useRef<HTMLDivElement>(null)
  const connectedRef = useRef<HTMLDivElement>(null)

  // All multiplayer state from useSignaling
  const {
    isSignalingConnected,
    isInRoom,
    isRoomIdle,
    currentRoomId,
    error,
    isPeerConnected,
    connectedPeerCount,
    createRoom,
    joinRoom,
    leaveRoom,
  } = useSignaling()

  // View switching (idle -> waiting -> connected)
  type View = 'idle' | 'waiting' | 'connected'
  const view: View = isPeerConnected ? 'connected' : isRoomIdle ? 'idle' : 'waiting'

  const animatedPanelClass = (status: string) =>
    twJoin(
      // base
      'transform-gpu w-80 translate-y-2 opacity-0',
      'transition-[transform,opacity] duration-200 ease-out motion-reduce:transition-none motion-reduce:transform-none',
      // enter/entered
      (status === 'entering' || status === 'entered') && 'translate-y-0 opacity-100',
      // exit/exited
      (status === 'exiting' || status === 'exited') && 'translate-y-2 opacity-0',
    )

  // WebRTC for sending game-start message
  const { state: webrtcState, actions } = useWebRTC()
  const { peers } = webrtcState

  // Derive share URL from current room
  const shareUrl = useMemo(
    () => (currentRoomId ? `${window.location.origin}/?room=${currentRoomId}` : ''),
    [currentRoomId],
  )

  // Update URL when room changes
  useEffect(() => {
    if (currentRoomId) setQueryParam('room', currentRoomId)
  }, [currentRoomId])

  // Auto-join if room is in URL (only attempt once)
  useEffect(() => {
    if (roomFromUrl && isSignalingConnected && isRoomIdle && !autoJoinAttemptedRef.current) {
      autoJoinAttemptedRef.current = true
      joinRoom(roomFromUrl)
    }
  }, [roomFromUrl, isSignalingConnected, isRoomIdle, joinRoom])

  // Reset URL when room doesn't exist (error when auto-joining from URL)
  useEffect(() => {
    if (error && autoJoinAttemptedRef.current && isRoomIdle) removeQueryParam('room')
  }, [error, isRoomIdle])

  const handleCreateRoom = useCallback(() => {
    if (!isSignalingConnected) return
    createRoom(roomIdInput)
  }, [isSignalingConnected, roomIdInput, createRoom])

  const handleJoinRoom = useCallback(() => {
    if (!isSignalingConnected) return
    joinRoom(roomIdInput)
  }, [isSignalingConnected, roomIdInput, joinRoom])

  const handleLeaveRoom = useCallback(() => {
    leaveRoom()
    removeQueryParam('room')
  }, [leaveRoom])

  const handleCopyLink = useCallback(async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }, [shareUrl])

  const handleBack = useCallback(() => {
    if (isInRoom) handleLeaveRoom()
    onBack()
  }, [isInRoom, handleLeaveRoom, onBack])

  // Start race: send game-start message to peer, both start countdown
  const handleStartRace = useCallback(() => {
    // Send game-start message to all peers
    const message: GameStartMessage = {
      type: MultiplayerMessage.GAME_START,
      data: { startTime: Date.now() },
    }
    peers.forEach((_, peerId) => {
      actions.sendMessage(peerId, message)
    })

    // Start local countdown as host (spawns on the right)
    startMultiplayerCountdown(true)
  }, [peers, actions, startMultiplayerCountdown])

  return (
    <div className="min-h-80 w-full space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-purple-300">
          <Users className="size-5" />
          Multiplayer Race
        </h3>
      </div>

      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm">
          {isSignalingConnected ? (
            <>
              <Wifi className="size-4 text-green-400" />
              <span className="text-green-400">Server connected</span>
            </>
          ) : (
            <>
              <WifiOff className="size-4 text-red-400" />
              <span className="text-red-400">Server offline</span>
            </>
          )}
        </div>

        <SwitchTransition mode="out-in">
          {view === 'idle' ? (
            <Transition
              key="idle"
              nodeRef={idleRef}
              timeout={{ enter: 200, exit: 200 }}
              mountOnEnter
              unmountOnExit
              appear>
              {(status) => (
                <div ref={idleRef} className={animatedPanelClass(status)}>
                  <div>
                    <label className="mb-1 block text-sm text-gray-400">Room Name</label>
                    <input
                      type="text"
                      value={roomIdInput}
                      onChange={(e) =>
                        setRoomIdInput(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))
                      }
                      placeholder="Enter room name"
                      disabled={!isSignalingConnected}
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-4 py-3 text-white placeholder-gray-500 transition-colors focus:border-purple-500/50 focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Button
                      onClick={handleCreateRoom}
                      disabled={!isSignalingConnected || !roomIdInput}
                      className="flex-1 bg-purple-500/20 whitespace-nowrap text-purple-300 hover:bg-purple-500/30 disabled:opacity-50">
                      Create Room
                    </Button>
                    <Button
                      onClick={handleJoinRoom}
                      disabled={!isSignalingConnected || !roomIdInput}
                      className="flex-1 bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-50">
                      Join Room
                    </Button>
                  </div>

                  {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}

                  <p
                    aria-hidden={isSignalingConnected}
                    className={twJoin(
                      'min-h-1 text-center text-xs text-gray-500',
                      'transition-opacity duration-200 ease-out motion-reduce:transition-none',
                      isSignalingConnected
                        ? 'pointer-events-none opacity-0 select-none'
                        : 'opacity-100',
                    )}>
                    Start server: cd signaling-server && npm run dev
                  </p>

                  {/* Slight Y enter/exit on the Back CTA (handleBack) */}
                  <Button
                    onClick={handleBack}
                    variant="secondary"
                    className={twJoin(
                      'mt-4 w-full transform-gpu transition-transform ease-out motion-reduce:transition-none',
                      (status === 'entering' || status === 'entered') &&
                        'translate-y-0 duration-200',
                      (status === 'exiting' || status === 'exited') &&
                        'translate-y-1 duration-200',
                    )}>
                    Back
                  </Button>
                </div>
              )}
            </Transition>
          ) : view === 'waiting' ? (
            <Transition
              key="waiting"
              nodeRef={waitingRef}
              timeout={{ enter: 200, exit: 200 }}
              mountOnEnter
              unmountOnExit
              appear>
              {(status) => (
                <div ref={waitingRef} className={animatedPanelClass(status)}>
                  <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Loader2 className="size-4 animate-spin text-purple-400" />
                      <span className="text-sm font-medium text-purple-300">
                        Waiting for opponent...
                      </span>
                    </div>

                    {shareUrl && (
                      <div className="space-y-2">
                        <p className="text-xs text-gray-400">
                          Share this link with your opponent:
                        </p>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={shareUrl}
                            readOnly
                            onClick={(e) => e.currentTarget.select()}
                            className="flex-1 rounded border border-purple-500/30 bg-purple-900/20 px-3 py-2 text-sm text-purple-200"
                          />
                          <Button
                            onClick={handleCopyLink}
                            className="flex items-center gap-1 bg-purple-500/20 px-3 text-purple-300 hover:bg-purple-500/30">
                            <Copy className="size-4" />
                            {copied ? 'Copied!' : 'Copy'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  <Button onClick={handleLeaveRoom} variant="secondary" className="mt-4 w-full">
                    Cancel
                  </Button>
                </div>
              )}
            </Transition>
          ) : (
            <Transition
              key="connected"
              nodeRef={connectedRef}
              timeout={{ enter: 200, exit: 200 }}
              mountOnEnter
              unmountOnExit
              appear>
              {(status) => (
                <div ref={connectedRef} className={animatedPanelClass(status)}>
                  <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Users className="size-5 text-green-400" />
                        <span className="font-medium text-green-300">Opponent connected!</span>
                      </div>
                      <span className="text-sm text-green-400">
                        {connectedPeerCount + 1} players
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-3">
                    <Button onClick={handleLeaveRoom} variant="secondary" className="flex-1">
                      Leave
                    </Button>
                    <Button
                      onClick={handleStartRace}
                      className="flex-1 bg-emerald-500/20 whitespace-nowrap text-emerald-300 hover:bg-emerald-500/30">
                      Start Race!
                    </Button>
                  </div>
                </div>
              )}
            </Transition>
          )}
        </SwitchTransition>
      </div>
    </div>
  )
}

export default MultiplayerSetup
