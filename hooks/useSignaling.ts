import { useEffect, useMemo, useRef, useState } from 'react'

import { PeerRole, RoomState, useWebRTC } from '@/components/WebRTCProvider'
import { SignalingClient, type SignalingEventHandlers } from '@/utils/webrtc/SignalingClient'

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL ?? 'ws://localhost:8080'

/**
 * useSignaling
 *
 * Hook for managing WebRTC signaling and room-based matchmaking.
 *
 * FLOW:
 * 1. Connect to signaling server on mount (if autoConnect=true)
 * 2. Create/join room → server notifies other peers
 * 3. When peer joins, initiate WebRTC handshake (offer/answer/ICE exchange)
 * 4. Once data channel opens, peers can send game messages directly
 */
const useSignaling = ({
  signalingUrl = SIGNALING_URL,
  autoConnect = true,
}: {
  signalingUrl?: string
  autoConnect?: boolean
} = {}) => {
  const { state, actions, store } = useWebRTC()
  const { localPeerId, peers, dataChannelStates, roomState, currentRoomId, isHost, error } =
    state

  const signalingClientRef = useRef<SignalingClient | null>(null)

  // Local signaling connection state (ephemeral - not in store)
  const [isSignalingConnected, setIsSignalingConnected] = useState(false)

  // Derive peer connection state
  const connectedPeers = useMemo(() => {
    return Array.from(peers.keys()).filter((peerId) => dataChannelStates.get(peerId))
  }, [peers, dataChannelStates])

  const isPeerConnected = connectedPeers.length > 0
  const connectedPeerCount = connectedPeers.length

  useEffect(() => {
    if (!localPeerId || !signalingUrl) return

    actions.setIceCandidateHandler((peerId, candidate) => {
      if (signalingClientRef.current?.isConnected()) {
        signalingClientRef.current.sendIceCandidate(peerId, candidate)
      }
    })

    const handlers: SignalingEventHandlers = {
      onConnected: () => setIsSignalingConnected(true),
      onDisconnected: () => {
        setIsSignalingConnected(false)
        store.getState().setRoomState(RoomState.IDLE)
        store.getState().setCurrentRoomId(null)
      },

      onPeerJoined: async (peerId) => {
        // We're the host - create offer and send to joining peer
        actions.createPeerConnection(peerId, PeerRole.HOST)
        const offer = await actions.createOffer(peerId)
        signalingClientRef.current?.sendOffer(peerId, offer)
      },

      onPeerLeft: () => {},

      onOffer: async (from, offer) => {
        // We're the client - create answer and send back
        actions.createPeerConnection(from, PeerRole.CLIENT)
        await actions.setRemoteDescription(from, offer)
        const answer = await actions.createAnswer(from)
        signalingClientRef.current?.sendAnswer(from, answer)
      },

      onAnswer: async (from, answer) => {
        await actions.setRemoteDescription(from, answer)
      },

      onIceCandidate: async (from, candidate) => {
        await actions.addIceCandidate(from, candidate)
      },

      onRoomCreated: (roomId) => {
        store.getState().setCurrentRoomId(roomId)
        store.getState().setRoomState(RoomState.IN_ROOM)
        store.getState().setIsHost(true)
        store.getState().setError(null)
      },
      onRoomJoined: (roomId) => {
        store.getState().setCurrentRoomId(roomId)
        store.getState().setRoomState(RoomState.IN_ROOM)
        store.getState().setIsHost(false)
        store.getState().setError(null)
      },
      onRoomFull: () => {
        store.getState().setRoomState(RoomState.IDLE)
        store.getState().setError('Room is full. Try a different room name.')
      },
      onError: (message) => {
        console.error('[Signaling]', message)
        store.getState().setError(message)
        // Reset to idle state on error (e.g., room not found when trying to join)
        store.getState().setRoomState(RoomState.IDLE)
      },
    }

    signalingClientRef.current = new SignalingClient(signalingUrl, localPeerId, handlers)

    if (autoConnect) {
      signalingClientRef.current.connect().catch((error) => {
        console.error('[Signaling] Connection failed:', error)
      })
    }

    return () => {
      signalingClientRef.current?.disconnect()
      signalingClientRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPeerId, signalingUrl, autoConnect])

  // API for room management
  const createRoom = (roomId: string) => {
    store.getState().setRoomState(RoomState.CREATING)
    store.getState().setError(null)
    signalingClientRef.current?.createRoom(roomId)
  }

  const joinRoom = (roomId: string) => {
    store.getState().setRoomState(RoomState.JOINING)
    store.getState().setError(null)
    signalingClientRef.current?.joinRoom(roomId)
  }

  const leaveRoom = () => {
    if (currentRoomId) {
      signalingClientRef.current?.leaveRoom(currentRoomId)
    }
    store.getState().setRoomState(RoomState.IDLE)
    store.getState().setCurrentRoomId(null)
    store.getState().setIsHost(false)
    store.getState().setError(null)
  }

  return {
    isSignalingConnected,
    roomState,
    isInRoom: roomState === RoomState.IN_ROOM,
    isRoomIdle: roomState === RoomState.IDLE,
    currentRoomId,
    isHost,
    error,
    isPeerConnected,
    connectedPeerCount,
    createRoom,
    joinRoom,
    leaveRoom,
  }
}

export default useSignaling

// Re-export RoomState for consumers
export { RoomState }
