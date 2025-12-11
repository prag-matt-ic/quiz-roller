import { useEffect, useRef, useState } from 'react'

import { useWebRTC, useWebRTCStore } from '@/components/webrtc/WebRTCProvider'
import { PeerRole } from '@/stores/webrtc/types'
import { SignalingClient, type SignalingEventHandlers } from '@/utils/webrtc/SignalingClient'

type UseSignalingOptions = {
  signalingUrl: string // WebSocket URL of signaling server (e.g., 'ws://localhost:8080')
  autoConnect?: boolean // Whether to connect automatically on mount
  onRoomCreated?: (roomId: string) => void // Callback when room is created
  onRoomJoined?: (roomId: string, peers: string[]) => void // Callback when joined a room
  onRoomFull?: (roomId: string) => void // Callback when trying to join a full room
}

/**
 * useSignaling
 *
 * Hook to manage signaling server connection and automatic WebRTC peer setup.
 *
 * WHAT IS SIGNALING?
 * WebRTC peers need to exchange connection information (SDP offers/answers and ICE candidates)
 * before they can connect directly. A signaling server facilitates this exchange.
 *
 * THIS HOOK:
 * - Connects to the signaling server via WebSocket
 * - Automatically creates WebRTC peer connections when peers join
 * - Handles the offer/answer exchange (HOST creates offer, CLIENT creates answer)
 * - Forwards ICE candidates between peers via signaling server
 * - Manages room-based multiplayer (create/join/leave rooms)
 *
 * FLOW:
 * 1. Player A creates room → becomes HOST
 * 2. Player B joins room → becomes CLIENT
 * 3. Server notifies Player A that Player B joined
 * 4. Player A creates peer connection + offer → sends to Player B via server
 * 5. Player B creates peer connection + answer → sends to Player A via server
 * 6. Both exchange ICE candidates via server
 * 7. Direct peer-to-peer connection established!
 *
 * USAGE:
 * const { createRoom, joinRoom, isConnected } = useSignaling({
 *   signalingUrl: 'ws://localhost:8080',
 *   onRoomJoined: (roomId, peers) => console.log('Joined!', roomId)
 * })
 *
 * createRoom('my-room')  // Become host
 * joinRoom('my-room')    // Join as client
 */
export function useSignaling({
  signalingUrl,
  autoConnect = true,
  onRoomCreated,
  onRoomJoined,
  onRoomFull,
}: UseSignalingOptions) {
  const localPeerId = useWebRTCStore((s) => s.localPeerId)
  const signalingClientRef = useRef<SignalingClient | null>(null)
  const [isSignalingConnected, setIsSignalingConnected] = useState(false)

  // Get WebRTC connection management functions
  const {
    createPeerConnection,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    setIceCandidateHandler,
  } = useWebRTC()

  useEffect(() => {
    if (!localPeerId || !signalingUrl) {
      console.warn('[useSignaling] Waiting for localPeerId or signalingUrl', {
        localPeerId,
        signalingUrl,
      })
      return
    }

    console.warn('[useSignaling] Initializing signaling client', { localPeerId, signalingUrl })

    // Register ICE candidate handler BEFORE creating peer connections
    // This ensures ICE candidates are forwarded to signaling server as soon as they're generated
    setIceCandidateHandler((peerId, candidate) => {
      if (signalingClientRef.current?.isConnected()) {
        console.warn(`Sending ICE candidate to ${peerId}`)
        signalingClientRef.current.sendIceCandidate(peerId, candidate)
      } else {
        console.error('Cannot send ICE candidate - signaling not connected')
      }
    })

    // Define handlers for signaling events
    const handlers: SignalingEventHandlers = {
      onConnected: () => {
        console.warn('Connected to signaling server')
        setIsSignalingConnected(true)
      },

      onDisconnected: () => {
        console.warn('Disconnected from signaling server')
        setIsSignalingConnected(false)
      },

      // When a new peer joins our room (we are the HOST)
      onPeerJoined: async (peerId) => {
        console.warn(`Peer joined: ${peerId}`)

        // As host, create connection and send offer to initiate handshake
        createPeerConnection(peerId, PeerRole.HOST)
        const offer = await createOffer(peerId)
        signalingClientRef.current?.sendOffer(peerId, offer)
      },

      // When a peer leaves the room
      onPeerLeft: (peerId) => {
        console.warn(`Peer left: ${peerId}`)
        // Connection cleanup handled automatically by WebRTC provider
      },

      // When we receive an offer from the HOST (we are the CLIENT)
      onOffer: async (from, offer) => {
        console.warn(`Received offer from ${from}`)

        // As client, create connection, set remote description, and send answer
        createPeerConnection(from, PeerRole.CLIENT)
        await setRemoteDescription(from, offer)
        const answer = await createAnswer(from)
        signalingClientRef.current?.sendAnswer(from, answer)
      },

      // When we receive an answer to our offer (we are the HOST)
      onAnswer: async (from, answer) => {
        console.warn(`Received answer from ${from}`)
        await setRemoteDescription(from, answer)
      },

      // When we receive an ICE candidate from a peer
      onIceCandidate: async (from, candidate) => {
        console.warn(`Received ICE candidate from ${from}`)
        await addIceCandidate(from, candidate)
      },

      // Room management callbacks
      onRoomCreated: (roomId) => {
        console.warn(`Room created: ${roomId}`)
        onRoomCreated?.(roomId)
      },

      onRoomJoined: (roomId, peers) => {
        console.warn(`Joined room: ${roomId}`, peers)
        onRoomJoined?.(roomId, peers)
      },

      onRoomFull: (roomId) => {
        console.warn(`Room full: ${roomId}`)
        onRoomFull?.(roomId)
      },

      onError: (message) => {
        console.error('Signaling error:', message)
      },
    }

    // Create and optionally connect to signaling server
    signalingClientRef.current = new SignalingClient(signalingUrl, localPeerId, handlers)

    if (autoConnect) {
      signalingClientRef.current.connect().catch((error) => {
        console.error('Failed to connect to signaling server:', error)
      })
    }

    // Cleanup on unmount
    return () => {
      signalingClientRef.current?.disconnect()
      signalingClientRef.current = null
    }
  }, [
    localPeerId,
    signalingUrl,
    autoConnect,
    createPeerConnection,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    setIceCandidateHandler,
    onRoomCreated,
    onRoomJoined,
    onRoomFull,
  ])

  // API for room management
  const createRoom = (roomId: string) => {
    signalingClientRef.current?.createRoom(roomId)
  }

  const joinRoom = (roomId: string) => {
    signalingClientRef.current?.joinRoom(roomId)
  }

  const leaveRoom = (roomId: string) => {
    signalingClientRef.current?.leaveRoom(roomId)
  }

  const isConnected = () => isSignalingConnected

  return {
    isSignalingConnected,
    createRoom,
    joinRoom,
    leaveRoom,
    isConnected,
  }
}
