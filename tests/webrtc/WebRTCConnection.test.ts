import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WebRTCConnection, type PeerConnectionCallbacks } from '@/utils/webrtc/WebRTCConnection'

describe('WebRTCConnection', () => {
  let connection: WebRTCConnection
  let callbacks: PeerConnectionCallbacks
  const peerId = 'test-peer-123'

  // Helper to get the most recent RTCPeerConnection instance
  const getLatestPeerConnection = () => {
    const mock = vi.mocked(RTCPeerConnection)
    return mock.mock.results[mock.mock.results.length - 1].value
  }

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks()

    callbacks = {
      onConnectionStateChange: vi.fn(),
      onSignalingStateChange: vi.fn(),
      onIceCandidate: vi.fn(),
      onDataChannelOpen: vi.fn(),
      onDataChannelClose: vi.fn(),
      onDataChannelMessage: vi.fn(),
      onError: vi.fn(),
    }
  })

  afterEach(() => {
    connection?.close()
  })

  describe('Host initialization', () => {
    it('should create peer connection as host', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      expect(RTCPeerConnection).toHaveBeenCalled()
    })

    it('should create data channel when initialized as host', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      expect(peerConnectionInstance.createDataChannel).toHaveBeenCalledWith('game-data')
    })

    it('should use custom data channel label if provided', () => {
      connection = new WebRTCConnection(peerId, callbacks, {
        dataChannelLabel: 'custom-channel',
      })
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      expect(peerConnectionInstance.createDataChannel).toHaveBeenCalledWith('custom-channel')
    })
  })

  describe('Client initialization', () => {
    it('should create peer connection as client', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsClient()

      expect(RTCPeerConnection).toHaveBeenCalled()
    })

    it('should not create data channel when initialized as client', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsClient()

      const peerConnectionInstance = getLatestPeerConnection()
      expect(peerConnectionInstance.createDataChannel).not.toHaveBeenCalled()
    })

    it('should set up ondatachannel handler', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsClient()

      const peerConnectionInstance = getLatestPeerConnection()
      expect(peerConnectionInstance.ondatachannel).toBeDefined()
    })
  })

  describe('Offer/Answer exchange', () => {
    it('should create and set local description for offer', async () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const offer = await connection.createOffer()

      const peerConnectionInstance = getLatestPeerConnection()
      expect(peerConnectionInstance.createOffer).toHaveBeenCalled()
      expect(peerConnectionInstance.setLocalDescription).toHaveBeenCalledWith(offer)
      expect(offer).toEqual({ type: 'offer', sdp: 'mock-sdp-offer' })
    })

    it('should create and set local description for answer', async () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsClient()

      const answer = await connection.createAnswer()

      const peerConnectionInstance = getLatestPeerConnection()
      expect(peerConnectionInstance.createAnswer).toHaveBeenCalled()
      expect(peerConnectionInstance.setLocalDescription).toHaveBeenCalledWith(answer)
      expect(answer).toEqual({ type: 'answer', sdp: 'mock-sdp-answer' })
    })

    it('should set remote description', async () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsClient()

      const remoteDescription = { type: 'offer' as const, sdp: 'remote-sdp' }
      await connection.setRemoteDescription(remoteDescription)

      const peerConnectionInstance = getLatestPeerConnection()
      expect(peerConnectionInstance.setRemoteDescription).toHaveBeenCalledWith(
        remoteDescription,
      )
    })

    it('should throw error when creating offer without initialization', async () => {
      connection = new WebRTCConnection(peerId, callbacks)

      await expect(connection.createOffer()).rejects.toThrow('Peer connection not initialized')
    })

    it('should throw error when creating answer without initialization', async () => {
      connection = new WebRTCConnection(peerId, callbacks)

      await expect(connection.createAnswer()).rejects.toThrow('Peer connection not initialized')
    })
  })

  describe('ICE candidates', () => {
    it('should add ICE candidate', async () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      // Set remote description first (required before adding ICE candidates)
      const remoteDescription = { type: 'answer' as const, sdp: 'remote-sdp' }
      await connection.setRemoteDescription(remoteDescription)

      const candidate = { candidate: 'ice-candidate', sdpMid: '0', sdpMLineIndex: 0 }
      await connection.addIceCandidate(candidate)

      const peerConnectionInstance = getLatestPeerConnection()
      expect(peerConnectionInstance.addIceCandidate).toHaveBeenCalledWith(candidate)
    })

    it('should call onIceCandidate callback when ICE candidate is generated', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      const mockCandidate = { candidate: 'test-candidate', sdpMid: '0' }

      // Simulate ICE candidate event
      peerConnectionInstance.onicecandidate?.({
        candidate: mockCandidate,
      } as unknown as RTCPeerConnectionIceEvent)

      expect(callbacks.onIceCandidate).toHaveBeenCalledWith(mockCandidate)
    })

    it('should not call onIceCandidate when candidate is null', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()

      // Simulate ICE candidate event with null (end of candidates)
      peerConnectionInstance.onicecandidate?.({
        candidate: null,
      } as unknown as RTCPeerConnectionIceEvent)

      expect(callbacks.onIceCandidate).not.toHaveBeenCalled()
    })
  })

  describe('Connection state callbacks', () => {
    it('should call onConnectionStateChange callback', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      peerConnectionInstance.connectionState = 'connected'

      // Simulate connection state change
      peerConnectionInstance.onconnectionstatechange?.({} as Event)

      expect(callbacks.onConnectionStateChange).toHaveBeenCalledWith(peerId, 'connected')
    })

    it('should call onSignalingStateChange callback', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      peerConnectionInstance.signalingState = 'have-local-offer'

      // Simulate signaling state change
      peerConnectionInstance.onsignalingstatechange?.({} as Event)

      expect(callbacks.onSignalingStateChange).toHaveBeenCalledWith('have-local-offer')
    })
  })

  describe('Data channel messaging', () => {
    it('should send message through data channel', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      const dataChannel =
        peerConnectionInstance.createDataChannel.mock.results[
          peerConnectionInstance.createDataChannel.mock.results.length - 1
        ].value
      dataChannel.readyState = 'open'

      const message = { type: 'test', data: { foo: 'bar' } }
      const result = connection.sendMessage(message)

      expect(result).toBe(true)
      expect(dataChannel.send).toHaveBeenCalled()
      const sentData = JSON.parse(dataChannel.send.mock.calls[0][0])
      expect(sentData.type).toBe('test')
      expect(sentData.data).toEqual({ foo: 'bar' })
      expect(sentData.timestamp).toBeDefined()
    })

    it('should not send message when data channel is closed', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      const dataChannel =
        peerConnectionInstance.createDataChannel.mock.results[
          peerConnectionInstance.createDataChannel.mock.results.length - 1
        ].value
      dataChannel.readyState = 'closed'

      const message = { type: 'test', data: {} }
      const result = connection.sendMessage(message)

      expect(result).toBe(false)
      expect(dataChannel.send).not.toHaveBeenCalled()
    })

    it('should call onDataChannelMessage when message received', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      const dataChannel =
        peerConnectionInstance.createDataChannel.mock.results[
          peerConnectionInstance.createDataChannel.mock.results.length - 1
        ].value

      // Simulate data channel open by calling the onopen handler directly
      dataChannel.onopen?.({} as Event)
      expect(callbacks.onDataChannelOpen).toHaveBeenCalled()

      // Simulate message received by calling the onmessage handler directly
      const message = {
        type: 'player-position',
        data: { x: 1, y: 2, z: 3 },
        timestamp: Date.now(),
      }
      dataChannel.onmessage?.({ data: JSON.stringify(message) } as MessageEvent)

      expect(callbacks.onDataChannelMessage).toHaveBeenCalledWith(message)
    })
  })

  describe('Connection state', () => {
    it('should return connection state', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      peerConnectionInstance.connectionState = 'connected'

      expect(connection.getConnectionState()).toBe('connected')
    })

    it('should return signaling state', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      peerConnectionInstance.signalingState = 'stable'

      expect(connection.getSignalingState()).toBe('stable')
    })

    it('should return data channel open status', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      const dataChannel =
        peerConnectionInstance.createDataChannel.mock.results[
          peerConnectionInstance.createDataChannel.mock.results.length - 1
        ].value
      dataChannel.readyState = 'open'

      expect(connection.isDataChannelOpen()).toBe(true)
    })
  })

  describe('Connection cleanup', () => {
    it('should close peer connection and data channel', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      const dataChannel =
        peerConnectionInstance.createDataChannel.mock.results[
          peerConnectionInstance.createDataChannel.mock.results.length - 1
        ].value

      connection.close()

      expect(dataChannel.close).toHaveBeenCalled()
      expect(peerConnectionInstance.close).toHaveBeenCalled()
    })

    it('should handle close when not initialized', () => {
      connection = new WebRTCConnection(peerId, callbacks)

      expect(() => connection.close()).not.toThrow()
    })
  })

  describe('Error handling', () => {
    it('should call onError on data channel error', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      const peerConnectionInstance = getLatestPeerConnection()
      const dataChannel =
        peerConnectionInstance.createDataChannel.mock.results[
          peerConnectionInstance.createDataChannel.mock.results.length - 1
        ].value

      // Simulate data channel error by calling the onerror handler directly
      dataChannel.onerror?.('Channel error' as unknown as Event)

      expect(callbacks.onError).toHaveBeenCalledWith(
        expect.stringContaining('Data channel error'),
      )
    })
  })

  describe('Custom ICE servers', () => {
    it('should use custom ICE servers when provided', () => {
      const customServers = [{ urls: 'stun:custom-stun-server.com:3478' }]
      connection = new WebRTCConnection(peerId, callbacks, {
        iceServers: customServers,
      })
      connection.initAsHost()

      expect(RTCPeerConnection).toHaveBeenCalledWith({
        iceServers: customServers,
      })
    })

    it('should use default ICE servers when not provided', () => {
      connection = new WebRTCConnection(peerId, callbacks)
      connection.initAsHost()

      expect(RTCPeerConnection).toHaveBeenCalledWith({
        iceServers: expect.arrayContaining([
          expect.objectContaining({ urls: expect.stringContaining('stun.l.google.com') }),
        ]),
      })
    })
  })
})
