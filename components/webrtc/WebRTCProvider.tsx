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

import { createWebRTCStore } from '@/stores/webrtc/createWebRTCStore'
import { ConnectionState, PeerRole, type WebRTCStore } from '@/stores/webrtc/types'
import {
  type PeerConnectionCallbacks,
  type WebRTCConfig,
  WebRTCConnection,
} from '@/utils/webrtc/WebRTCConnection'

/**
 * Fallback ICE servers if API fetch fails
 * Google STUN servers only - no TURN relay capability
 */
const FALLBACK_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
]

const parseIceTransportPolicy = (
  value: string | undefined,
): RTCIceTransportPolicy | undefined => {
  const normalized = value?.trim().toLowerCase()
  if (normalized === 'relay' || normalized === 'all') return normalized
  return undefined
}

const ENV_ICE_TRANSPORT_POLICY = parseIceTransportPolicy(
  process.env.NEXT_PUBLIC_WEBRTC_ICE_TRANSPORT_POLICY,
)

// Context for the Zustand store - provides reactive state across the component tree
const WebRTCContext = createContext<ReturnType<typeof createWebRTCStore>>(undefined!)
const WebRTCConfigContext = createContext<WebRTCConfig | undefined>(undefined)
// Context for ICE servers fetched from API
const IceServersContext = createContext<RTCIceServer[]>(FALLBACK_ICE_SERVERS)

// Context for active peer connections - uses ref to avoid re-renders when connections change
// This is a Map of peerId -> WebRTCConnection instances
const ConnectionsContext = createContext<React.MutableRefObject<Map<string, WebRTCConnection>>>(
  undefined!,
)

// Maximum number of simultaneous peer connections (2 players for this game)
const MAX_PEERS = 2

type Props = PropsWithChildren<{
  config?: WebRTCConfig
}>

/**
 * WebRTCProvider
 *
 * Root provider component for WebRTC multiplayer functionality.
 *
 * RESPONSIBILITIES:
 * - Creates and manages the Zustand store for WebRTC state (connections, messages, ICE candidates)
 * - Generates a unique local peer ID on mount
 * - Maintains a ref-based Map of active peer connections (avoids unnecessary re-renders)
 * - Handles cleanup of all connections when component unmounts
 *
 * USAGE:
 * Wrap your app or multiplayer section with this provider:
 * <WebRTCProvider>
 *   <YourMultiplayerComponent />
 * </WebRTCProvider>
 *
 * Then use the hooks:
 * - useWebRTCStore() for reactive state (peers, messages, connection state)
 * - useWebRTC() for connection management (create peers, send messages)
 * - useSignaling() for signaling server integration
 *
 * Note: SignalingClient should be managed separately via useSignaling hook
 * to avoid duplicate connections and provide more control over connection lifecycle.
 */
export const WebRTCProvider: FC<Props> = ({ children, config }) => {
  // Create store once on mount - contains all reactive WebRTC state
  const [store] = useState(() => createWebRTCStore())
  const [iceServers, setIceServers] = useState<RTCIceServer[]>(FALLBACK_ICE_SERVERS)

  // Ref-based map of peer connections - doesn't cause re-renders when connections added/removed
  const connectionsRef = useRef<Map<string, WebRTCConnection>>(new Map())

  // Fetch TURN credentials from our API route (keeps API key server-side)
  useEffect(() => {
    const fetchIceServers = async () => {
      try {
        const response = await fetch('/api/turn-credentials')
        if (!response.ok) throw new Error('Failed to fetch TURN credentials')
        const servers = await response.json()
        if (Array.isArray(servers) && servers.length > 0) {
          // Add Google STUN servers as fallback
          setIceServers([{ urls: 'stun:stun.l.google.com:19302' }, ...servers])
          console.warn('[WebRTCProvider] Loaded TURN credentials from API')
        }
      } catch (error) {
        console.error(
          '[WebRTCProvider] Failed to fetch TURN credentials, using fallback:',
          error,
        )
      }
    }
    fetchIceServers()
  }, [])

  useEffect(() => {
    const connections = connectionsRef.current

    // Generate unique local peer ID (used for signaling and identifying this client)
    const localId = `peer-${Math.random().toString(36).substring(2, 11)}`
    console.warn('[WebRTCProvider] Setting localPeerId:', localId)
    store.getState().setLocalPeerId(localId)

    // Cleanup all connections on unmount to prevent memory leaks
    return () => {
      connections.forEach((connection) => {
        connection.close()
      })
      connections.clear()
      store.getState().reset()
    }
  }, [store])

  return (
    <WebRTCContext.Provider value={store}>
      <WebRTCConfigContext.Provider value={config}>
        <IceServersContext.Provider value={iceServers}>
          <ConnectionsContext.Provider value={connectionsRef}>
            {children}
          </ConnectionsContext.Provider>
        </IceServersContext.Provider>
      </WebRTCConfigContext.Provider>
    </WebRTCContext.Provider>
  )
}

/**
 * useWebRTCStore
 *
 * Hook to access reactive WebRTC state from the Zustand store.
 * Uses selectors for optimal performance - only re-renders when selected data changes.
 *
 * USAGE:
 * const localPeerId = useWebRTCStore(s => s.localPeerId)
 * const peers = useWebRTCStore(s => s.peers)
 * const messages = useWebRTCStore(s => s.messagesReceived)
 */
export function useWebRTCStore<T>(selector: (state: WebRTCStore) => T): T {
  const store = useContext(WebRTCContext)
  if (!store) throw new Error('Missing WebRTCProvider in the tree')
  return useStore(store, selector)
}

/**
 * useWebRTCStoreAPI
 *
 * Hook to access the raw Zustand store API.
 * Use this when you need to call actions directly or subscribe to state changes.
 *
 * USAGE:
 * const storeAPI = useWebRTCStoreAPI()
 * storeAPI.getState().addPeer(peerId, role)
 */
export function useWebRTCStoreAPI() {
  const store = useContext(WebRTCContext)
  if (!store) throw new Error('Missing WebRTCProvider in the tree')
  return store
}

/**
 * useWebRTC
 *
 * Hook to manage WebRTC peer connections and data channels.
 *
 * RESPONSIBILITIES:
 * - Create peer connections (as host or client)
 * - Generate and exchange SDP offers/answers
 * - Handle ICE candidate exchange
 * - Send/receive messages through data channels
 * - Manage connection lifecycle (close, cleanup)
 *
 * KEY CONCEPTS:
 * - HOST: The peer that creates the room and initiates connections (creates data channel)
 * - CLIENT: The peer that joins an existing room (receives data channel)
 * - Offer/Answer: SDP exchange required to establish peer connection
 * - ICE Candidates: Network paths for NAT traversal (sent via signaling server)
 *
 * USAGE:
 * const { createPeerConnection, sendMessage, createOffer } = useWebRTC()
 *
 * // Host creates connection and offer
 * createPeerConnection(peerId, PeerRole.HOST)
 * const offer = await createOffer(peerId)
 *
 * // Client responds with answer
 * createPeerConnection(peerId, PeerRole.CLIENT)
 * await setRemoteDescription(peerId, offer)
 * const answer = await createAnswer(peerId)
 */
export function useWebRTC() {
  const store = useWebRTCStoreAPI()
  const connectionsRef = useContext(ConnectionsContext)
  const providerConfig = useContext(WebRTCConfigContext)
  const iceServers = useContext(IceServersContext)
  if (!connectionsRef) throw new Error('Missing WebRTCProvider in the tree')

  // Ref to hold ICE candidate handler - allows signaling layer to send candidates to server
  const iceCandidateHandlerRef = useRef<
    ((peerId: string, candidate: RTCIceCandidate) => void) | null
  >(null)

  // Create callbacks that update the Zustand store when connection state changes
  const createCallbacks = useCallback(
    (peerId: string): PeerConnectionCallbacks => ({
      // Update peer connection state in store (new -> connecting -> connected -> closed)
      onConnectionStateChange: (id, state) => {
        store.getState().updatePeerConnectionState(id, state)

        // Update overall connection state based on peer state
        if (state === 'connected') {
          store.getState().setConnectionState(ConnectionState.CONNECTED)
        } else if (state === 'failed' || state === 'closed') {
          store.getState().setConnectionState(ConnectionState.FAILED)
        }
      },

      // Update signaling state (stable -> have-local-offer -> have-remote-offer -> stable)
      onSignalingStateChange: (state) => {
        store.getState().setSignalingState(state)
      },

      // Handle ICE candidate generation - forward to signaling server
      onIceCandidate: (candidate) => {
        // Store in Zustand for debugging/monitoring
        store.getState().addIceCandidate(candidate)
        // Send to signaling server via registered handler
        iceCandidateHandlerRef.current?.(peerId, candidate)
      },

      // Data channel opened - ready to send messages
      onDataChannelOpen: () => {
        store.getState().setDataChannelOpen(peerId, true)
      },

      // Data channel closed - can't send messages anymore
      onDataChannelClose: () => {
        store.getState().setDataChannelOpen(peerId, false)
      },

      // Message received from peer via data channel
      onDataChannelMessage: (message) => {
        // Add sender identification to received message
        const messageWithSender = {
          ...message,
          from: peerId,
        }
        store.getState().addReceivedMessage(messageWithSender)
      },

      // Connection error occurred
      onError: (error) => {
        store.getState().setError(error)
      },
    }),
    [store],
  )

  /**
   * Create a new peer connection
   *
   * @param peerId - Unique identifier for the remote peer
   * @param role - HOST (creates data channel) or CLIENT (receives data channel)
   * @param config - Optional WebRTC configuration (ICE servers, data channel label)
   * @throws Error if MAX_PEERS limit is exceeded
   */
  const createPeerConnection = useCallback(
    (peerId: string, role: PeerRole, connectionConfig?: WebRTCConfig) => {
      // Enforce 2-player limit for the game
      if (connectionsRef.current.size >= MAX_PEERS) {
        const error = `Maximum peers (${MAX_PEERS}) exceeded. Cannot add peer ${peerId}.`
        console.error(error)
        store.getState().setError(error)
        throw new Error(error)
      }

      const callbacks = createCallbacks(peerId)
      const mergedConfig: WebRTCConfig = {
        // Use ICE servers from API (fetched on mount) or fallback
        iceServers: connectionConfig?.iceServers ?? providerConfig?.iceServers ?? iceServers,
        dataChannelLabel:
          connectionConfig?.dataChannelLabel ?? providerConfig?.dataChannelLabel,
        iceTransportPolicy:
          connectionConfig?.iceTransportPolicy ??
          providerConfig?.iceTransportPolicy ??
          ENV_ICE_TRANSPORT_POLICY,
      }
      const connection = new WebRTCConnection(peerId, callbacks, mergedConfig)

      // Initialize as host or client (determines who creates data channel)
      if (role === PeerRole.HOST) {
        connection.initAsHost()
      } else {
        connection.initAsClient()
      }

      // Store connection in map and update Zustand store
      connectionsRef.current.set(peerId, connection)
      store.getState().addPeer(peerId, role)
      store.getState().setConnectionState(ConnectionState.CONNECTING)

      return connection
    },
    [store, createCallbacks, connectionsRef, providerConfig, iceServers],
  )

  /**
   * Create SDP offer (HOST side)
   * Must be called after createPeerConnection with PeerRole.HOST
   */
  const createOffer = useCallback(
    async (peerId: string): Promise<RTCSessionDescriptionInit> => {
      const connection = connectionsRef.current.get(peerId)
      if (!connection) {
        throw new Error(`No connection found for peer ${peerId}`)
      }

      const offer = await connection.createOffer()
      store.getState().setPendingOffer(offer)
      return offer
    },
    [store, connectionsRef],
  )

  /**
   * Create SDP answer (CLIENT side)
   * Must be called after setRemoteDescription with the received offer
   */
  const createAnswer = useCallback(
    async (peerId: string): Promise<RTCSessionDescriptionInit> => {
      const connection = connectionsRef.current.get(peerId)
      if (!connection) {
        throw new Error(`No connection found for peer ${peerId}`)
      }

      const answer = await connection.createAnswer()
      store.getState().setPendingAnswer(answer)
      return answer
    },
    [store, connectionsRef],
  )

  /**
   * Set remote description (offer from HOST or answer from CLIENT)
   * This establishes what the remote peer wants to send/receive
   */
  const setRemoteDescription = useCallback(
    async (peerId: string, description: RTCSessionDescriptionInit): Promise<void> => {
      const connection = connectionsRef.current.get(peerId)
      if (!connection) {
        throw new Error(`No connection found for peer ${peerId}`)
      }

      await connection.setRemoteDescription(description)
    },
    [connectionsRef],
  )

  /**
   * Add ICE candidate received from signaling server
   * ICE candidates are network paths for NAT traversal
   */
  const addIceCandidate = useCallback(
    async (peerId: string, candidate: RTCIceCandidateInit): Promise<void> => {
      const connection = connectionsRef.current.get(peerId)
      if (!connection) {
        throw new Error(`No connection found for peer ${peerId}`)
      }

      await connection.addIceCandidate(candidate)
    },
    [connectionsRef],
  )

  /**
   * Send a message through the data channel to a specific peer
   * Returns false if data channel is not open
   */
  const sendMessage = useCallback(
    (peerId: string, message: { type: string; data: unknown }): boolean => {
      const connection = connectionsRef.current.get(peerId)
      if (!connection) {
        console.error(`[WebRTC] Cannot send message - no connection found for peer: ${peerId}`)
        return false
      }

      if (!connection.isDataChannelOpen()) {
        console.error(
          `[WebRTC] Cannot send message to ${peerId} - data channel not open (state: ${connection.getConnectionState()})`,
        )
        return false
      }

      const sent = connection.sendMessage(message)
      if (sent) {
        const fullMessage = {
          ...message,
          timestamp: Date.now(),
          from: store.getState().localPeerId || 'unknown',
        }
        store.getState().addSentMessage(fullMessage)
      }
      return sent
    },
    [store, connectionsRef],
  )

  /**
   * Close a specific peer connection and clean up resources
   */
  const closePeerConnection = useCallback(
    (peerId: string): void => {
      const connection = connectionsRef.current.get(peerId)
      if (connection) {
        connection.close()
        connectionsRef.current.delete(peerId)
        store.getState().removePeer(peerId)
      }

      // Update overall state if no peers remain
      if (connectionsRef.current.size === 0) {
        store.getState().setConnectionState(ConnectionState.DISCONNECTED)
      }
    },
    [store, connectionsRef],
  )

  /**
   * Close all peer connections (e.g., when leaving multiplayer)
   */
  const closeAllConnections = useCallback((): void => {
    connectionsRef.current.forEach((connection) => {
      connection.close()
    })
    connectionsRef.current.clear()
    store.getState().reset()
  }, [store, connectionsRef])

  /**
   * Register a handler for ICE candidate events
   * Used by useSignaling to forward candidates to signaling server
   */
  const setIceCandidateHandler = useCallback(
    (handler: (peerId: string, candidate: RTCIceCandidate) => void) => {
      iceCandidateHandlerRef.current = handler
    },
    [],
  )

  return {
    createPeerConnection,
    createOffer,
    createAnswer,
    setRemoteDescription,
    addIceCandidate,
    sendMessage,
    closePeerConnection,
    closeAllConnections,
    setIceCandidateHandler,
  }
}
