import { useEffect, useRef, useState } from 'react'

import { useWebRTC, useWebRTCStore } from '@/components/webrtc/WebRTCProvider'
import { PeerRole } from '@/stores/webrtc/types'
import { SignalingClient, type SignalingEventHandlers } from '@/utils/webrtc/SignalingClient'

type UseSignalingOptions = {
  signalingUrl: string
  autoConnect?: boolean
  onRoomCreated?: (roomId: string) => void
  onRoomJoined?: (roomId: string, peers: string[]) => void
  onRoomFull?: (roomId: string) => void
}

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
      onDisconnected: () => setIsSignalingConnected(false),

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

      onRoomCreated: (roomId) => onRoomCreated?.(roomId),
      onRoomJoined: (roomId, peers) => onRoomJoined?.(roomId, peers),
      onRoomFull: (roomId) => onRoomFull?.(roomId),
      onError: (message) => console.error('[Signaling]', message),
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
