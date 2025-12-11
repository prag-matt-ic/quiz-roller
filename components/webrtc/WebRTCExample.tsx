'use client'
import { type FC, useState } from 'react'

import { WebRTCProvider, useWebRTC, useWebRTCStore } from '@/components/webrtc/WebRTCProvider'
import { useWebRTCMessages } from '@/hooks/useWebRTCMessages'
import { ConnectionState, PeerRole } from '@/stores/webrtc/types'

/**
 * Example component demonstrating WebRTC usage
 *
 * This shows how to:
 * - Create peer connections
 * - Exchange SDP offers/answers
 * - Send/receive messages
 * - Monitor connection state
 *
 * In a real implementation, you would exchange SDP and ICE candidates
 * through a signaling server (WebSocket, HTTP, etc.)
 */
const WebRTCExample: FC = () => {
  const {
    createPeerConnection,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    sendMessage,
    closePeerConnection,
  } = useWebRTC()

  // Subscribe to store state
  const localPeerId = useWebRTCStore((s) => s.localPeerId)
  const connectionState = useWebRTCStore((s) => s.connectionState)
  const dataChannelStates = useWebRTCStore((s) => s.dataChannelStates)
  const peers = useWebRTCStore((s) => s.peers)
  const error = useWebRTCStore((s) => s.error)
  const pendingOffer = useWebRTCStore((s) => s.pendingOffer)
  const pendingIceCandidates = useWebRTCStore((s) => s.pendingIceCandidates)
  const messages = useWebRTCStore((s) => s.messagesReceived)

  // Check if any peer has an open data channel
  const hasAnyDataChannelOpen = Array.from(peers.keys()).some((peerId) =>
    dataChannelStates.get(peerId),
  )

  // Subscribe to messages
  useWebRTCMessages((message) => {
    console.warn('Received message:', message)
  })

  const [remotePeerId, setRemotePeerId] = useState('')
  const [messageText, setMessageText] = useState('')

  // Example: Host creates connection and offer
  const handleCreateHost = async () => {
    const peerId = `remote-${Date.now()}`
    setRemotePeerId(peerId)

    createPeerConnection(peerId, PeerRole.HOST)
    const offer = await createOffer(peerId)

    console.warn('Created offer:', offer)
    // In real app: send offer to remote peer via signaling server
  }

  // Example: Client creates connection
  const handleCreateClient = async () => {
    const peerId = `remote-${Date.now()}`
    setRemotePeerId(peerId)

    createPeerConnection(peerId, PeerRole.CLIENT)

    console.warn('Client created, waiting for offer...')
    // In real app: wait for offer from signaling server, then call setRemoteDescription
  }

  // Example: Accept remote offer (client side)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAcceptOffer = async (offer: RTCSessionDescriptionInit) => {
    if (!remotePeerId) return

    await setRemoteDescription(remotePeerId, offer)
    const answer = await createAnswer(remotePeerId)

    console.warn('Created answer:', answer)
    // In real app: send answer to remote peer via signaling server
  }

  // Example: Accept remote answer (host side)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAcceptAnswer = async (answer: RTCSessionDescriptionInit) => {
    if (!remotePeerId) return

    await setRemoteDescription(remotePeerId, answer)
    console.warn('Answer accepted')
  }

  // Example: Add ICE candidate
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleAddIceCandidate = async (candidate: RTCIceCandidateInit) => {
    if (!remotePeerId) return

    await addIceCandidate(remotePeerId, candidate)
  }

  // Example: Send message
  const handleSendMessage = () => {
    if (!remotePeerId || !messageText) return

    const sent = sendMessage(remotePeerId, {
      type: 'chat',
      data: { text: messageText },
    })

    if (sent) {
      setMessageText('')
    } else {
      console.error('Failed to send message')
    }
  }

  // Example: Close connection
  const handleDisconnect = () => {
    if (!remotePeerId) return
    closePeerConnection(remotePeerId)
    setRemotePeerId('')
  }

  return (
    <div className="p-8">
      <h1 className="mb-4 text-2xl font-bold">WebRTC Connection Test</h1>

      {/* Connection Info */}
      <div className="mb-6 rounded bg-gray-100 p-4">
        <p className="mb-2">
          <strong>Local Peer ID:</strong> {localPeerId ?? 'Not initialized'}
        </p>
        <p className="mb-2">
          <strong>Connection State:</strong> {connectionState}
        </p>
        <p className="mb-2">
          <strong>Data Channel:</strong> {hasAnyDataChannelOpen ? 'Open ✓' : 'Closed'}
        </p>
        <p className="mb-2">
          <strong>Connected Peers:</strong> {peers.size}
        </p>
        {error && (
          <p className="mt-2 text-red-600">
            <strong>Error:</strong> {error}
          </p>
        )}
      </div>

      {/* Connection Controls */}
      <div className="mb-6 space-x-2">
        <button
          onClick={handleCreateHost}
          className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
          disabled={connectionState !== ConnectionState.DISCONNECTED}>
          Create as Host
        </button>
        <button
          onClick={handleCreateClient}
          className="rounded bg-green-500 px-4 py-2 text-white hover:bg-green-600"
          disabled={connectionState !== ConnectionState.DISCONNECTED}>
          Create as Client
        </button>
        <button
          onClick={handleDisconnect}
          className="rounded bg-red-500 px-4 py-2 text-white hover:bg-red-600"
          disabled={connectionState === ConnectionState.DISCONNECTED}>
          Disconnect
        </button>
      </div>

      {/* Signaling Info (for manual testing) */}
      {pendingOffer && (
        <div className="mb-6 rounded bg-yellow-50 p-4">
          <p className="mb-2 font-semibold">Pending Offer (copy to peer):</p>
          <textarea
            className="w-full rounded border p-2 font-mono text-xs"
            rows={4}
            readOnly
            value={JSON.stringify(pendingOffer)}
          />
        </div>
      )}

      {pendingIceCandidates.length > 0 && (
        <div className="mb-6 rounded bg-yellow-50 p-4">
          <p className="mb-2 font-semibold">Pending ICE Candidates:</p>
          <p className="text-sm">{pendingIceCandidates.length} candidates</p>
        </div>
      )}

      {/* Message Controls */}
      {hasAnyDataChannelOpen && (
        <div className="mb-6">
          <h2 className="mb-2 text-xl font-semibold">Send Message</h2>
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
              className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600">
              Send
            </button>
          </div>
        </div>
      )}

      {/* Messages Display */}
      <div className="mb-6">
        <h2 className="mb-2 text-xl font-semibold">Messages ({messages.length})</h2>
        <div className="max-h-64 space-y-2 overflow-y-auto rounded border p-4">
          {messages.map((msg, idx) => (
            <div key={idx} className="rounded bg-blue-50 p-2">
              <p className="text-xs text-gray-500">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </p>
              <p className="font-semibold">{msg.type}</p>
              <p className="text-sm">{JSON.stringify(msg.data)}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="rounded bg-gray-50 p-4">
        <h2 className="mb-2 text-xl font-semibold">Instructions</h2>
        <ol className="list-inside list-decimal space-y-1 text-sm">
          <li>Open this page in two browser windows/tabs</li>
          <li>In window 1: Click &quot;Create as Host&quot;</li>
          <li>In window 2: Click &quot;Create as Client&quot;</li>
          <li>
            Copy the offer/answer and ICE candidates between windows (via clipboard or signaling
            server)
          </li>
          <li>Once connected, send messages between peers</li>
        </ol>
        <p className="mt-4 text-sm text-gray-600">
          Note: This is a demonstration. In production, you need a signaling server to exchange
          SDP and ICE candidates between peers.
        </p>
      </div>
    </div>
  )
}

/**
 * Example page component with WebRTCProvider
 */
export default function WebRTCTestPage() {
  return (
    <WebRTCProvider>
      <WebRTCExample />
    </WebRTCProvider>
  )
}
