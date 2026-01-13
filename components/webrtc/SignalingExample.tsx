'use client'
import { type FC, useState } from 'react'

import { WebRTCProvider, useWebRTC, useWebRTCStore } from '@/components/webrtc/WebRTCProvider'
import useSignaling, { RoomState } from '@/hooks/useSignaling'
import { useWebRTCMessages } from '@/hooks/useWebRTCMessages'

/**
 * Example multiplayer lobby with automatic signaling
 */
const MultiplayerLobby: FC = () => {
  const [roomIdInput, setRoomIdInput] = useState('')
  const [messageText, setMessageText] = useState('')

  // Subscribe to WebRTC state
  const localPeerId = useWebRTCStore((s) => s.localPeerId)
  const peers = useWebRTCStore((s) => s.peers)
  const messagesReceived = useWebRTCStore((s) => s.messagesReceived)

  // Subscribe to messages
  useWebRTCMessages((message) => {
    console.warn('Received message:', message)
  })

  // Get sendMessage function
  const { sendMessage } = useWebRTC()

  // Use signaling hook for automatic connection management
  const {
    isSignalingConnected,
    roomState,
    isInRoom,
    currentRoomId,
    isHost,
    error,
    isPeerConnected,
    connectedPeerCount,
    createRoom,
    joinRoom,
    leaveRoom,
  } = useSignaling({ autoConnect: true })

  const handleCreateRoom = () => {
    if (!roomIdInput.trim()) {
      alert('Please enter a room ID')
      return
    }
    createRoom(roomIdInput)
  }

  const handleJoinRoom = () => {
    if (!roomIdInput.trim()) {
      alert('Please enter a room ID')
      return
    }
    joinRoom(roomIdInput)
  }

  const handleLeaveRoom = () => {
    leaveRoom()
  }

  const handleSendMessage = () => {
    if (!messageText.trim()) return

    if (peers.size === 0) {
      console.error('No peers connected')
      return
    }

    if (!isPeerConnected) {
      console.error('Data channel not open yet - please wait for connection to establish')
      return
    }

    // Send to all connected peers
    let anySent = false
    peers.forEach((_, peerId) => {
      const sent = sendMessage(peerId, {
        type: 'chat',
        data: messageText,
      })
      if (sent) {
        anySent = true
        console.warn('Message sent to', peerId)
      } else {
        console.error('Failed to send message to', peerId, '- data channel not ready')
      }
    })

    if (anySent) {
      setMessageText('')
    }
  }

  const getRoomStateLabel = () => {
    switch (roomState) {
      case RoomState.Creating:
        return 'Creating room...'
      case RoomState.Joining:
        return 'Joining room...'
      case RoomState.InRoom:
        return `In room: ${currentRoomId}`
      default:
        return 'Not in a room'
    }
  }

  return (
    <div className="mx-auto max-w-4xl p-8 text-black">
      <h1 className="mb-6 text-3xl font-bold text-white">Multiplayer Lobby</h1>

      {/* Connection Status */}
      <div className="mb-6 rounded-lg bg-gray-100 p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Local Peer ID</p>
            <p className="font-mono text-sm">{localPeerId ?? 'Initializing...'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Signaling Server</p>
            <p className="text-sm">
              {isSignalingConnected ? (
                <span className="text-green-600">✓ Connected</span>
              ) : (
                <span className="text-red-600">✗ Disconnected</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Room State</p>
            <p className="font-mono text-sm">{getRoomStateLabel()}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Role</p>
            <p className="text-sm">
              {isInRoom ? (isHost ? '👑 Host' : '🎮 Guest') : '-'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Peer Connection</p>
            <p className="text-sm">
              {isPeerConnected ? (
                <span className="text-green-600">✓ Connected to {connectedPeerCount} peer(s)</span>
              ) : (
                <span className="text-gray-500">Waiting for peers...</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Data Channel</p>
            <p className="text-sm">
              {isPeerConnected ? (
                <span className="text-green-600">✓ Open</span>
              ) : (
                <span className="text-gray-500">Not ready</span>
              )}
            </p>
          </div>
        </div>
        {error && (
          <div className="mt-4 rounded bg-red-50 p-3 text-sm text-red-600">
            <strong>Error:</strong> {error}
          </div>
        )}
      </div>

      {/* Room Controls */}
      {!isInRoom ? (
        <div className="mb-6 rounded-lg border-2 border-blue-200 bg-blue-50 p-6 text-black">
          <h2 className="mb-4 text-xl font-semibold">Join or Create Room</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              placeholder="Enter room ID (e.g., my-game-room)"
              className="flex-1 rounded border px-4 py-2"
              disabled={!isSignalingConnected}
            />
            <button
              onClick={handleCreateRoom}
              className="rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 disabled:bg-gray-300"
              disabled={!isSignalingConnected || !roomIdInput.trim()}>
              Create
            </button>
            <button
              onClick={handleJoinRoom}
              className="rounded bg-green-500 px-6 py-2 text-white hover:bg-green-600 disabled:bg-gray-300"
              disabled={!isSignalingConnected || !roomIdInput.trim()}>
              Join
            </button>
          </div>
          {!isSignalingConnected && (
            <p className="mt-2 text-sm text-gray-600">
              Connecting to signaling server...
            </p>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-lg border-2 border-green-200 bg-green-50 p-6">
          <h2 className="mb-2 text-xl font-semibold">
            {isHost ? '👑 Hosting' : '🎮 In'} Room: {currentRoomId}
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            {connectedPeerCount === 0
              ? 'Waiting for other players...'
              : `${connectedPeerCount} peer(s) connected`}
          </p>
          <button
            onClick={handleLeaveRoom}
            className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600">
            Leave Room
          </button>
        </div>
      )}

      {/* Connected Peers */}
      {peers.size > 0 && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">Connected Peers</h2>
          <div className="space-y-2">
            {Array.from(peers.values()).map((peer) => (
              <div
                key={peer.id}
                className="flex items-center justify-between rounded bg-gray-50 p-3">
                <div>
                  <p className="font-mono text-sm">{peer.id}</p>
                  <p className="text-xs text-gray-500">
                    Role: {peer.role} | State: {peer.connectionState}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Chat/Messages (when data channel is open) */}
      {isPeerConnected && (
        <div className="mb-6 rounded-lg border p-4">
          <h2 className="mb-3 text-lg font-semibold">Messages</h2>
          <div className="mb-4 max-h-64 space-y-2 overflow-y-auto rounded bg-gray-50 p-3">
            {messagesReceived.length > 0 ? (
              messagesReceived.map((msg, idx) => (
                <div key={idx} className="rounded bg-white p-2 shadow-sm">
                  <p className="text-xs text-gray-500">
                    {new Date(msg.timestamp).toLocaleTimeString()}
                  </p>
                  <p className="font-semibold">{msg.type}</p>
                  <p className="text-sm">{JSON.stringify(msg.data)}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500">No messages yet</p>
            )}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 rounded border px-3 py-2"
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
            />
            <button
              onClick={handleSendMessage}
              disabled={!isPeerConnected}
              className="rounded bg-blue-500 px-6 py-2 text-white hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300">
              Send
            </button>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-lg bg-gray-50 p-4">
        <h2 className="mb-2 text-lg font-semibold">How to Test Multiplayer</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm">
          <li>
            Make sure the signaling server is running:{' '}
            <code className="rounded bg-gray-200 px-1">cd signaling-server && npm run dev</code>
          </li>
          <li>Open this page in two browser windows (or different browsers)</li>
          <li>In window 1: Enter a room ID and click &quot;Create&quot;</li>
          <li>In window 2: Enter the same room ID and click &quot;Join&quot;</li>
          <li>Once connected, you can send messages between peers</li>
        </ol>
        <p className="mt-3 text-xs text-gray-600">
          The signaling server automatically handles SDP exchange and ICE candidates. No manual
          copying needed!
        </p>
      </div>
    </div>
  )
}

/**
 * Example page with WebRTCProvider
 */
export default function SignalingExamplePage() {
  return (
    <WebRTCProvider>
      <MultiplayerLobby />
    </WebRTCProvider>
  )
}
