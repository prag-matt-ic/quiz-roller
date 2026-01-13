'use client'

import { Copy, Loader2, Users, Wifi, WifiOff } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { type FC, useCallback, useEffect, useMemo, useState } from 'react'

import { useGameStore } from '@/components/GameProvider'
import { useWebRTC, useWebRTCStore } from '@/components/WebRTCProvider'
import Button from '@/components/ui/Button'
import useSignaling from '@/hooks/useSignaling'
import type { GameStartMessage } from '@/utils/multiplayer'

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
  const router = useRouter()
  const searchParams = useSearchParams()
  const roomFromUrl = searchParams.get('room')
  const startMultiplayerCountdown = useGameStore((s) => s.startMultiplayerCountdown)

  // Local state
  const [roomIdInput, setRoomIdInput] = useState(() => roomFromUrl || generateRoomId())
  const [copied, setCopied] = useState(false)

  // All multiplayer state from useSignaling
  const {
    isSignalingConnected,
    isInRoom,
    isRoomIdle,
    currentRoomId,
    isHost,
    error,
    isPeerConnected,
    connectedPeerCount,
    createRoom,
    joinRoom,
    leaveRoom,
  } = useSignaling()

  // WebRTC for sending game-start message
  const { sendMessage } = useWebRTC()
  const peers = useWebRTCStore((s) => s.peers)

  // Derive share URL from current room
  const shareUrl = useMemo(
    () => (currentRoomId ? `${window.location.origin}/?room=${currentRoomId}` : ''),
    [currentRoomId],
  )

  // Update URL when room changes
  useEffect(() => {
    if (currentRoomId) router.push(`/?room=${currentRoomId}`)
  }, [currentRoomId, router])

  // Auto-join if room is in URL
  useEffect(() => {
    if (roomFromUrl && isSignalingConnected && isRoomIdle) joinRoom(roomFromUrl)
  }, [roomFromUrl, isSignalingConnected, isRoomIdle, joinRoom])

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
    router.push('/')
  }, [router, leaveRoom])

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

  // Start race: host sends game-start message to peer, both start countdown
  const handleStartRace = useCallback(() => {
    // Send game-start message to all peers
    const message: GameStartMessage = {
      type: 'game-start',
      data: { startTime: Date.now() },
    }
    peers.forEach((_, peerId) => {
      sendMessage(peerId, message)
    })

    // Start local countdown (host spawns on the left)
    startMultiplayerCountdown(isHost)
  }, [peers, sendMessage, startMultiplayerCountdown, isHost])

  return (
    <div className="w-full space-y-4">
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

        {/* Idle state - room creation/joining */}
        {isRoomIdle && (
          <>
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

            <div className="flex gap-3">
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

            {error && <p className="text-center text-sm text-red-400">{error}</p>}

            {!isSignalingConnected && (
              <p className="text-center text-xs text-gray-500">
                Start server: cd signaling-server && npm run dev
              </p>
            )}

            <Button onClick={handleBack} variant="secondary" className="w-full">
              Back
            </Button>
          </>
        )}

        {/* Waiting state - share link and wait for peer */}
        {!isRoomIdle && !isPeerConnected && (
          <>
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Loader2 className="size-4 animate-spin text-purple-400" />
                <span className="text-sm font-medium text-purple-300">
                  Waiting for opponent...
                </span>
              </div>

              {shareUrl && (
                <div className="space-y-2">
                  <p className="text-xs text-gray-400">Share this link with your opponent:</p>
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

            <Button onClick={handleLeaveRoom} variant="secondary" className="w-full">
              Cancel
            </Button>
          </>
        )}

        {/* Connected state - ready to start */}
        {isPeerConnected && (
          <>
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="size-5 text-green-400" />
                  <span className="font-medium text-green-300">Opponent connected!</span>
                </div>
                <span className="text-sm text-green-400">{connectedPeerCount + 1} players</span>
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleLeaveRoom} variant="secondary" className="flex-1">
                Leave
              </Button>
              <Button
                onClick={handleStartRace}
                className="flex-1 bg-emerald-500/20 whitespace-nowrap text-emerald-300 hover:bg-emerald-500/30">
                Start Race!
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default MultiplayerSetup
