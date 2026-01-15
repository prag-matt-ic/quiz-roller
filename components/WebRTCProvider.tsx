'use client'
import {
  type FC,
  type PropsWithChildren,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { useStore } from 'zustand'
import { useShallow } from 'zustand/shallow'

import {
  ConnectionState,
  PeerRole,
  RoomState,
  type WebRTCStore,
  createWebRTCStore,
} from '@/stores/webrtcStore'
import type { MultiplayerMessageUnion } from '@/utils/multiplayer/messages'
import {
  type PeerConnectionCallbacks,
  type WebRTCConfig,
  WebRTCConnection,
} from '@/utils/webrtc/WebRTCConnection'

/**
 * WebRTC Provider - Simplified Architecture
 *
 * SINGLE HOOK API:
 * const { state, actions, store } = useWebRTC()
 *
 * - state: Reactive state (triggers re-renders)
 * - actions: Methods for connection management
 * - store: Raw Zustand store API for callbacks/effects
 */

const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

const ENV_ICE_TRANSPORT_POLICY = (() => {
  const value = process.env.NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY?.trim().toLowerCase()
  return value === 'relay' || value === 'all' ? value : undefined
})()

const MAX_PEERS = 2

type WebRTCContextValue = {
  store: ReturnType<typeof createWebRTCStore>
  connectionsRef: React.MutableRefObject<Map<string, WebRTCConnection>>
  iceServers: RTCIceServer[]
  config?: WebRTCConfig
}

const WebRTCContext = createContext<WebRTCContextValue | null>(null)

type Props = PropsWithChildren<{ config?: WebRTCConfig }>

/**
 * WebRTCProvider - Root provider for WebRTC multiplayer
 */
export const WebRTCProvider: FC<Props> = ({ children, config }) => {
  const [store] = useState(() => createWebRTCStore())
  const [iceServers, setIceServers] = useState<RTCIceServer[]>(FALLBACK_ICE_SERVERS)
  const connectionsRef = useRef<Map<string, WebRTCConnection>>(new Map())

  // Fetch TURN credentials
  useEffect(() => {
    fetch('/api/turn-credentials')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((servers) => {
        if (Array.isArray(servers) && servers.length > 0) {
          setIceServers([{ urls: 'stun:stun.l.google.com:19302' }, ...servers])
        }
      })
      .catch(() => {})
  }, [])

  // Generate peer ID and cleanup
  useEffect(() => {
    const connections = connectionsRef.current
    const localId = `peer-${Math.random().toString(36).substring(2, 11)}`
    store.getState().setLocalPeerId(localId)

    return () => {
      connections.forEach((c) => c.close())
      connections.clear()
      store.getState().reset()
    }
  }, [store])

  return (
    <WebRTCContext.Provider value={{ store, connectionsRef, iceServers, config }}>
      {children}
    </WebRTCContext.Provider>
  )
}

function useWebRTCContext() {
  const ctx = useContext(WebRTCContext)
  if (!ctx) throw new Error('Missing WebRTCProvider')
  return ctx
}

/**
 * useWebRTC - Single unified hook for all WebRTC functionality
 *
 * USAGE:
 * const { state, actions, store } = useWebRTC()
 *
 * // Reactive state (re-renders on change)
 * const { localPeerId, peers, roomState, isHost } = state
 *
 * // Actions (stable references)
 * actions.sendMessage(peerId, { type: 'position', data: {...} })
 * actions.createRoom('my-room')
 *
 * // Store API (for effects/callbacks - non-reactive)
 * store.getState().setRoomState(RoomState.IDLE)
 * store.subscribe((s) => s.messagesReceived, callback)
 */
export function useWebRTC() {
  const { store, connectionsRef, iceServers, config: providerConfig } = useWebRTCContext()

  // ============================================================================
  // REACTIVE STATE (with shallow comparison to prevent unnecessary re-renders)
  // ============================================================================
  const storeState = useStore(
    store,
    useShallow((s) => ({
      localPeerId: s.localPeerId,
      peers: s.peers,
      connectionState: s.connectionState,
      error: s.error,
      roomState: s.roomState,
      currentRoomId: s.currentRoomId,
      isHost: s.isHost,
      dataChannelStates: s.dataChannelStates,
      messagesReceived: s.messagesReceived,
    })),
  )

  // ============================================================================
  // CONNECTION MANAGEMENT
  // ============================================================================
  const iceCandidateHandlerRef = useRef<
    ((peerId: string, candidate: RTCIceCandidate) => void) | null
  >(null)

  const createCallbacks = useCallback(
    (peerId: string): PeerConnectionCallbacks => ({
      onConnectionStateChange: (id, state) => {
        store.getState().updatePeerConnectionState(id, state)
        if (state === 'connected') {
          store.getState().setConnectionState(ConnectionState.CONNECTED)
        } else if (state === 'failed' || state === 'closed' || state === 'disconnected') {
          console.warn(`[WebRTC] Peer ${id} connection state changed to: ${state}`)
          store.getState().setConnectionState(ConnectionState.FAILED)
          // Remove the peer to trigger cleanup in useMultiplayerSync
          // This ensures the disconnect overlay shows during active races
          const timeout = state === 'disconnected' ? 3000 : 2000 // Give disconnected state more time to recover
          setTimeout(() => {
            const currentState = connectionsRef.current.get(id)?.getConnectionState()
            // Only remove if still in problematic state (not reconnecting)
            if (
              currentState === 'failed' ||
              currentState === 'closed' ||
              currentState === 'disconnected'
            ) {
              store.getState().removePeer(id)
            }
          }, timeout)
        }
      },
      onSignalingStateChange: (state) => store.getState().setSignalingState(state),
      onIceCandidate: (candidate) => {
        store.getState().addIceCandidate(candidate)
        iceCandidateHandlerRef.current?.(peerId, candidate)
      },
      onDataChannelOpen: () => store.getState().setDataChannelOpen(peerId, true),
      onDataChannelClose: () => store.getState().setDataChannelOpen(peerId, false),
      onDataChannelMessage: (message) => {
        store.getState().addReceivedMessage({ ...message, from: peerId })
      },
      onError: (error) => store.getState().setError(error),
    }),
    [store, connectionsRef],
  )

  const createPeerConnection = useCallback(
    (peerId: string, role: PeerRole, connectionConfig?: WebRTCConfig) => {
      if (connectionsRef.current.size >= MAX_PEERS) {
        const error = `Maximum peers (${MAX_PEERS}) exceeded`
        store.getState().setError(error)
        throw new Error(error)
      }

      const mergedConfig: WebRTCConfig = {
        iceServers: connectionConfig?.iceServers ?? providerConfig?.iceServers ?? iceServers,
        dataChannelLabel:
          connectionConfig?.dataChannelLabel ?? providerConfig?.dataChannelLabel,
        iceTransportPolicy:
          connectionConfig?.iceTransportPolicy ??
          providerConfig?.iceTransportPolicy ??
          ENV_ICE_TRANSPORT_POLICY,
      }

      const connection = new WebRTCConnection(peerId, createCallbacks(peerId), mergedConfig)

      if (role === PeerRole.HOST) {
        connection.initAsHost()
      } else {
        connection.initAsClient()
      }

      connectionsRef.current.set(peerId, connection)
      store.getState().addPeer(peerId, role)
      store.getState().setConnectionState(ConnectionState.CONNECTING)

      return connection
    },
    [store, createCallbacks, connectionsRef, providerConfig, iceServers],
  )

  const createOffer = useCallback(
    async (peerId: string): Promise<RTCSessionDescriptionInit> => {
      const connection = connectionsRef.current.get(peerId)
      if (!connection) throw new Error(`No connection for peer ${peerId}`)
      const offer = await connection.createOffer()
      store.getState().setPendingOffer(offer)
      return offer
    },
    [store, connectionsRef],
  )

  const createAnswer = useCallback(
    async (peerId: string): Promise<RTCSessionDescriptionInit> => {
      const connection = connectionsRef.current.get(peerId)
      if (!connection) throw new Error(`No connection for peer ${peerId}`)
      const answer = await connection.createAnswer()
      store.getState().setPendingAnswer(answer)
      return answer
    },
    [store, connectionsRef],
  )

  const setRemoteDescription = useCallback(
    async (peerId: string, description: RTCSessionDescriptionInit): Promise<void> => {
      const connection = connectionsRef.current.get(peerId)
      if (!connection) throw new Error(`No connection for peer ${peerId}`)
      await connection.setRemoteDescription(description)
    },
    [connectionsRef],
  )

  const addIceCandidate = useCallback(
    async (peerId: string, candidate: RTCIceCandidateInit): Promise<void> => {
      const connection = connectionsRef.current.get(peerId)
      if (!connection) throw new Error(`No connection for peer ${peerId}`)
      await connection.addIceCandidate(candidate)
    },
    [connectionsRef],
  )

  const sendMessage = useCallback(
    (peerId: string, message: MultiplayerMessageUnion): boolean => {
      const connection = connectionsRef.current.get(peerId)
      if (!connection || !connection.isDataChannelOpen()) return false
      return connection.sendMessage(message)
    },
    [connectionsRef],
  )

  const closePeerConnection = useCallback(
    (peerId: string): void => {
      const connection = connectionsRef.current.get(peerId)
      if (connection) {
        connection.close()
        connectionsRef.current.delete(peerId)
        store.getState().removePeer(peerId)
      }
      if (connectionsRef.current.size === 0) {
        store.getState().setConnectionState(ConnectionState.DISCONNECTED)
      }
    },
    [store, connectionsRef],
  )

  const closeAllConnections = useCallback((): void => {
    connectionsRef.current.forEach((c) => c.close())
    connectionsRef.current.clear()
    store.getState().reset()
  }, [store, connectionsRef])

  const setIceCandidateHandler = useCallback(
    (handler: (peerId: string, candidate: RTCIceCandidate) => void) => {
      iceCandidateHandlerRef.current = handler
    },
    [],
  )

  return {
    // Reactive state
    state: storeState,

    // Actions (stable references via useCallback)
    actions: {
      createPeerConnection,
      createOffer,
      createAnswer,
      setRemoteDescription,
      addIceCandidate,
      sendMessage,
      closePeerConnection,
      closeAllConnections,
      setIceCandidateHandler,
    },

    // Raw store API for effects/callbacks
    store,
  }
}

// Re-export types and enums for consumers
export { RoomState, PeerRole, ConnectionState }
export type { WebRTCStore }
