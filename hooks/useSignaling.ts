import { useEffect, useMemo, useRef, useState } from 'react'

import { useWebRTC, useWebRTCStore } from '@/components/WebRTCProvider'
import { PeerRole } from '@/stores/webrtc/types'
import { SignalingClient, type SignalingEventHandlers } from '@/utils/webrtc/SignalingClient'

const SIGNALING_URL = process.env.NEXT_PUBLIC_SIGNALING_URL ?? 'ws://localhost:8080'

export enum RoomState {
  Idle = 'idle',
  Creating = 'creating',
  Joining = 'joining',
  InRoom = 'in-room',
}

const useSignaling = ({
  signalingUrl = SIGNALING_URL,
  autoConnect = true,
}: {
  signalingUrl?: string
  autoConnect?: boolean
} = {}) => {
  const localPeerId = useWebRTCStore((s) => s.localPeerId)
  const peers = useWebRTCStore((s) => s.peers)
  const dataChannelStates = useWebRTCStore((s) => s.dataChannelStates)
  const signalingClientRef = useRef<SignalingClient | null>(null)

  // Connection & room state managed internally
  const [isSignalingConnected, setIsSignalingConnected] = useState(false)
  const [roomState, setRoomState] = useState<RoomState>(RoomState.Idle)
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null)
  const [isHost, setIsHost] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Derive peer connection state from WebRTC store
  const connectedPeers = useMemo(() => {
    return Array.from(peers.keys()).filter((peerId) => dataChannelStates.get(peerId))
  }, [peers, dataChannelStates])

  const isPeerConnected = connectedPeers.length > 0
  const connectedPeerCount = connectedPeers.length

  const {
    createPeerConnection,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    setIceCandidateHandler,
  } = useWebRTC()

  useEffect(() => {
    if (!localPeerId || !signalingUrl) return

    setIceCandidateHandler((peerId, candidate) => {
      if (signalingClientRef.current?.isConnected()) {
        signalingClientRef.current.sendIceCandidate(peerId, candidate)
      }
    })

    const handlers: SignalingEventHandlers = {
      onConnected: () => setIsSignalingConnected(true),
      onDisconnected: () => {
        setIsSignalingConnected(false)
        setRoomState(RoomState.Idle)
        setCurrentRoomId(null)
      },

      onPeerJoined: async (peerId) => {
        createPeerConnection(peerId, PeerRole.HOST)
        const offer = await createOffer(peerId)
        signalingClientRef.current?.sendOffer(peerId, offer)
      },

      onPeerLeft: () => {},

      onOffer: async (from, offer) => {
        createPeerConnection(from, PeerRole.CLIENT)
        await setRemoteDescription(from, offer)
        const answer = await createAnswer(from)
        signalingClientRef.current?.sendAnswer(from, answer)
      },

      onAnswer: async (from, answer) => {
        await setRemoteDescription(from, answer)
      },

      onIceCandidate: async (from, candidate) => {
        await addIceCandidate(from, candidate)
      },

      onRoomCreated: (roomId) => {
        setCurrentRoomId(roomId)
        setRoomState(RoomState.InRoom)
        setIsHost(true)
        setError(null)
      },
      onRoomJoined: (roomId) => {
        setCurrentRoomId(roomId)
        setRoomState(RoomState.InRoom)
        setIsHost(false)
        setError(null)
      },
      onRoomFull: () => {
        setRoomState(RoomState.Idle)
        setError('Room is full. Try a different room name.')
      },
      onError: (message) => {
        console.error('[Signaling]', message)
        setError(message)
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
    setRoomState(RoomState.Creating)
    setError(null)
    signalingClientRef.current?.createRoom(roomId)
  }

  const joinRoom = (roomId: string) => {
    setRoomState(RoomState.Joining)
    setError(null)
    signalingClientRef.current?.joinRoom(roomId)
  }

  const leaveRoom = () => {
    if (currentRoomId) {
      signalingClientRef.current?.leaveRoom(currentRoomId)
    }
    setRoomState(RoomState.Idle)
    setCurrentRoomId(null)
    setIsHost(false)
    setError(null)
  }

  return {
    isSignalingConnected,
    roomState,
    isInRoom: roomState === RoomState.InRoom,
    isRoomIdle: roomState === RoomState.Idle,
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
