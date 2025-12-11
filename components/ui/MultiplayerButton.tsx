'use client'

import { Users } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { type FC, useState } from 'react'

import Button from '@/components/ui/Button'
import { useWebRTCStore } from '@/components/webrtc/WebRTCProvider'
import { useSignaling } from '@/hooks/useSignaling'

/**
 * MultiplayerButton
 *
 * Compact multiplayer controls that integrate into the main game UI.
 * Shows in top-right corner with connection status and room management.
 */
const MultiplayerButton: FC = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const roomFromUrl = searchParams.get('room')

  const [isExpanded, setIsExpanded] = useState(false)
  const [roomId, setRoomId] = useState(() => roomFromUrl || 'game-room-1')
  const [signalingConnected, setSignalingConnected] = useState(false)
  const [shareUrl, setShareUrl] = useState('')

  const localPeerId = useWebRTCStore((s) => s.localPeerId)
  const peers = useWebRTCStore((s) => s.peers)
  const dataChannelStates = useWebRTCStore((s) => s.dataChannelStates)

  const {
    isSignalingConnected: isSignalingServerConnected,
    createRoom,
    joinRoom,
    leaveRoom,
  } = useSignaling({
    signalingUrl: 'ws://localhost:8080',
    autoConnect: true,
    onRoomCreated: () => setSignalingConnected(true),
    onRoomJoined: () => setSignalingConnected(true),
  })

  // Check if any peer has an open data channel
  const hasAnyPeerConnected = Array.from(peers.keys()).some((peerId) =>
    dataChannelStates.get(peerId),
  )
  const isPeerConnected = peers.size > 0 && hasAnyPeerConnected

  const handleCreateRoom = () => {
    if (!localPeerId || !isSignalingServerConnected) return
    createRoom(roomId)
    router.push(`/?room=${roomId}`)
    const url = `${window.location.origin}/?room=${roomId}`
    setShareUrl(url)
  }

  const handleJoinRoom = () => {
    if (!localPeerId || !isSignalingServerConnected) return
    joinRoom(roomId)
    router.push(`/?room=${roomId}`)
  }

  const handleLeaveRoom = () => {
    leaveRoom(roomId)
    setSignalingConnected(false)
    setShareUrl('')
    router.push('/')
    setIsExpanded(false)
  }

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      alert('Link copied! Share with another player.')
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  if (!isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className="pointer-events-auto flex items-center gap-2 rounded-lg border border-white/20 bg-black/80 px-3 py-2 backdrop-blur-sm transition-colors hover:bg-black/90">
        <Users className="size-4 text-white" />
        {isPeerConnected && (
          <div className="flex items-center gap-1.5">
            <div className="size-2 rounded-full bg-green-400" />
            <span className="text-xs text-white">{peers.size + 1}</span>
          </div>
        )}
      </button>
    )
  }

  return (
    <div className="pointer-events-auto w-80 rounded-lg border border-white/20 bg-black/90 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-white" />
          <h3 className="text-sm font-bold text-white">Multiplayer</h3>
        </div>
        <button
          onClick={() => setIsExpanded(false)}
          className="rounded p-1 text-white/70 hover:bg-white/10 hover:text-white">
          ✕
        </button>
      </div>

      <div className="mb-3 space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-400">Server:</span>
          <span className={isSignalingServerConnected ? 'text-green-400' : 'text-red-400'}>
            {isSignalingServerConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
        {isPeerConnected && (
          <div className="flex justify-between">
            <span className="text-gray-400">Players:</span>
            <span className="text-green-400">{peers.size + 1}</span>
          </div>
        )}
      </div>

      {!signalingConnected ? (
        <>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Room ID"
            disabled={!isSignalingServerConnected}
            className="mb-2 w-full rounded border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder-gray-500 disabled:opacity-50"
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCreateRoom}
              disabled={!localPeerId || !isSignalingServerConnected}
              className="flex-1 text-xs">
              Create
            </Button>
            <Button
              onClick={handleJoinRoom}
              disabled={!localPeerId || !isSignalingServerConnected}
              className="flex-1 text-xs">
              Join
            </Button>
          </div>
        </>
      ) : (
        <>
          {shareUrl && !isPeerConnected && (
            <div className="mb-2 rounded border border-purple-500/50 bg-purple-500/10 p-2">
              <p className="mb-1 text-xs font-semibold text-purple-400">Share link:</p>
              <div className="flex gap-1">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  onClick={(e) => e.currentTarget.select()}
                  className="flex-1 rounded border border-purple-500/50 bg-purple-900/20 px-2 py-1 text-xs text-purple-200"
                />
                <Button onClick={handleCopyLink} className="text-xs">
                  Copy
                </Button>
              </div>
            </div>
          )}
          {isPeerConnected && (
            <div className="mb-2 rounded border border-green-500/50 bg-green-500/10 p-2">
              <p className="text-xs font-semibold text-green-400">✓ Connected!</p>
            </div>
          )}
          <Button onClick={handleLeaveRoom} className="w-full text-xs">
            Leave Room
          </Button>
        </>
      )}

      {!isSignalingServerConnected && (
        <p className="mt-2 text-xs text-red-400">
          Start server: cd signaling-server && npm run dev
        </p>
      )}
    </div>
  )
}

export default MultiplayerButton
