import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWebRTCStore } from '@/stores/webrtc/createWebRTCStore'
import { ConnectionState, PeerRole } from '@/stores/webrtc/types'

describe('WebRTC Store', () => {
  let store: ReturnType<typeof createWebRTCStore>

  beforeEach(() => {
    store = createWebRTCStore()
  })

  describe('ConnectionSlice', () => {
    it('should initialize with default state', () => {
      const state = store.getState()

      expect(state.localPeerId).toBeNull()
      expect(state.peers.size).toBe(0)
      expect(state.connectionState).toBe(ConnectionState.DISCONNECTED)
      expect(state.error).toBeNull()
    })

    it('should set local peer ID', () => {
      store.getState().setLocalPeerId('peer-123')

      expect(store.getState().localPeerId).toBe('peer-123')
    })

    it('should add peer', () => {
      store.getState().addPeer('remote-peer-1', PeerRole.HOST)

      const peers = store.getState().peers
      expect(peers.size).toBe(1)
      expect(peers.get('remote-peer-1')).toEqual({
        id: 'remote-peer-1',
        role: PeerRole.HOST,
        connectionState: 'new',
      })
    })

    it('should update peer connection state', () => {
      store.getState().addPeer('remote-peer-1', PeerRole.CLIENT)
      store.getState().updatePeerConnectionState('remote-peer-1', 'connected')

      const peer = store.getState().peers.get('remote-peer-1')
      expect(peer?.connectionState).toBe('connected')
    })

    it('should remove peer', () => {
      store.getState().addPeer('remote-peer-1', PeerRole.HOST)
      store.getState().addPeer('remote-peer-2', PeerRole.CLIENT)
      store.getState().removePeer('remote-peer-1')

      const peers = store.getState().peers
      expect(peers.size).toBe(1)
      expect(peers.has('remote-peer-1')).toBe(false)
      expect(peers.has('remote-peer-2')).toBe(true)
    })

    it('should set connection state', () => {
      store.getState().setConnectionState(ConnectionState.CONNECTING)
      expect(store.getState().connectionState).toBe(ConnectionState.CONNECTING)

      store.getState().setConnectionState(ConnectionState.CONNECTED)
      expect(store.getState().connectionState).toBe(ConnectionState.CONNECTED)
    })

    it('should set error', () => {
      store.getState().setError('Connection failed')
      expect(store.getState().error).toBe('Connection failed')

      store.getState().setError(null)
      expect(store.getState().error).toBeNull()
    })

    it('should reset to initial state', () => {
      store.getState().setLocalPeerId('peer-123')
      store.getState().addPeer('remote-peer-1', PeerRole.HOST)
      store.getState().setConnectionState(ConnectionState.CONNECTED)
      store.getState().setError('Some error')

      store.getState().reset()

      const state = store.getState()
      expect(state.localPeerId).toBeNull()
      expect(state.peers.size).toBe(0)
      expect(state.connectionState).toBe(ConnectionState.DISCONNECTED)
      expect(state.error).toBeNull()
    })
  })

  describe('SignalingSlice', () => {
    it('should initialize with default state', () => {
      const state = store.getState()

      expect(state.signalingState).toBeNull()
      expect(state.pendingOffer).toBeNull()
      expect(state.pendingAnswer).toBeNull()
      expect(state.pendingIceCandidates).toEqual([])
    })

    it('should set signaling state', () => {
      store.getState().setSignalingState('have-local-offer')
      expect(store.getState().signalingState).toBe('have-local-offer')
    })

    it('should set pending offer', () => {
      const offer = { type: 'offer' as const, sdp: 'test-sdp' }
      store.getState().setPendingOffer(offer)

      expect(store.getState().pendingOffer).toEqual(offer)
    })

    it('should set pending answer', () => {
      const answer = { type: 'answer' as const, sdp: 'test-sdp' }
      store.getState().setPendingAnswer(answer)

      expect(store.getState().pendingAnswer).toEqual(answer)
    })

    it('should add ICE candidates', () => {
      const candidate1 = {
        candidate: 'ice-1',
        sdpMid: '0',
        sdpMLineIndex: 0,
      } as RTCIceCandidate
      const candidate2 = {
        candidate: 'ice-2',
        sdpMid: '1',
        sdpMLineIndex: 1,
      } as RTCIceCandidate

      store.getState().addIceCandidate(candidate1)
      store.getState().addIceCandidate(candidate2)

      const candidates = store.getState().pendingIceCandidates
      expect(candidates).toHaveLength(2)
      expect(candidates[0]).toBe(candidate1)
      expect(candidates[1]).toBe(candidate2)
    })

    it('should clear ICE candidates', () => {
      const candidate = { candidate: 'ice-1', sdpMid: '0', sdpMLineIndex: 0 } as RTCIceCandidate
      store.getState().addIceCandidate(candidate)
      store.getState().clearIceCandidates()

      expect(store.getState().pendingIceCandidates).toEqual([])
    })
  })

  describe('DataChannelSlice', () => {
    it('should initialize with default state', () => {
      const state = store.getState()

      expect(state.isDataChannelOpen).toBe(false)
      expect(state.messagesReceived).toEqual([])
      expect(state.messagesSent).toEqual([])
    })

    it('should set data channel open state', () => {
      store.getState().setDataChannelOpen(true)
      expect(store.getState().isDataChannelOpen).toBe(true)

      store.getState().setDataChannelOpen(false)
      expect(store.getState().isDataChannelOpen).toBe(false)
    })

    it('should add received message', () => {
      const message1 = { type: 'test-1', timestamp: 1000, data: { foo: 'bar' } }
      const message2 = { type: 'test-2', timestamp: 2000, data: { baz: 'qux' } }

      store.getState().addReceivedMessage(message1)
      store.getState().addReceivedMessage(message2)

      const messages = store.getState().messagesReceived
      expect(messages).toHaveLength(2)
      expect(messages[0]).toBe(message1)
      expect(messages[1]).toBe(message2)
    })

    it('should add sent message', () => {
      const message1 = { type: 'test-1', timestamp: 1000, data: {} }
      const message2 = { type: 'test-2', timestamp: 2000, data: {} }

      store.getState().addSentMessage(message1)
      store.getState().addSentMessage(message2)

      const messages = store.getState().messagesSent
      expect(messages).toHaveLength(2)
      expect(messages[0]).toBe(message1)
      expect(messages[1]).toBe(message2)
    })

    it('should clear messages', () => {
      const message = { type: 'test', timestamp: 1000, data: {} }
      store.getState().addReceivedMessage(message)
      store.getState().addSentMessage(message)

      store.getState().clearMessages()

      expect(store.getState().messagesReceived).toEqual([])
      expect(store.getState().messagesSent).toEqual([])
    })
  })

  describe('Store subscriptions', () => {
    it('should subscribe to connection state changes', () => {
      const callback = vi.fn()

      const unsubscribe = store.subscribe(
        (state: ReturnType<typeof store.getState>) => state.connectionState,
        callback,
      )

      store.getState().setConnectionState(ConnectionState.CONNECTING)
      expect(callback).toHaveBeenCalledWith(
        ConnectionState.CONNECTING,
        ConnectionState.DISCONNECTED,
      )

      store.getState().setConnectionState(ConnectionState.CONNECTED)
      expect(callback).toHaveBeenCalledWith(
        ConnectionState.CONNECTED,
        ConnectionState.CONNECTING,
      )

      unsubscribe()
    })

    it('should subscribe to data channel state changes', () => {
      const callback = vi.fn()

      const unsubscribe = store.subscribe(
        (state: ReturnType<typeof store.getState>) => state.isDataChannelOpen,
        callback,
      )

      store.getState().setDataChannelOpen(true)
      expect(callback).toHaveBeenCalledWith(true, false)

      unsubscribe()
    })

    it('should subscribe to messages', () => {
      const callback = vi.fn()

      const unsubscribe = store.subscribe(
        (state: ReturnType<typeof store.getState>) => state.messagesReceived,
        callback,
      )

      const message = { type: 'test', timestamp: 1000, data: {} }
      store.getState().addReceivedMessage(message)

      expect(callback).toHaveBeenCalled()

      unsubscribe()
    })
  })

  describe('Immutability', () => {
    it('should not mutate peers Map', () => {
      const originalPeers = store.getState().peers

      store.getState().addPeer('peer-1', PeerRole.HOST)

      const newPeers = store.getState().peers
      expect(newPeers).not.toBe(originalPeers)
      expect(originalPeers.size).toBe(0)
      expect(newPeers.size).toBe(1)
    })

    it('should not mutate messages arrays', () => {
      const originalReceived = store.getState().messagesReceived

      const message = { type: 'test', timestamp: 1000, data: {} }
      store.getState().addReceivedMessage(message)

      const newReceived = store.getState().messagesReceived
      expect(newReceived).not.toBe(originalReceived)
      expect(originalReceived.length).toBe(0)
      expect(newReceived.length).toBe(1)
    })

    it('should not mutate ICE candidates array', () => {
      const originalCandidates = store.getState().pendingIceCandidates

      const candidate = { candidate: 'ice-1', sdpMid: '0', sdpMLineIndex: 0 } as RTCIceCandidate
      store.getState().addIceCandidate(candidate)

      const newCandidates = store.getState().pendingIceCandidates
      expect(newCandidates).not.toBe(originalCandidates)
      expect(originalCandidates.length).toBe(0)
      expect(newCandidates.length).toBe(1)
    })
  })
})
