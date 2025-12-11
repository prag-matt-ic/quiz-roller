import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SignalingClient, MessageType } from '@/utils/webrtc/SignalingClient'

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  readyState = MockWebSocket.CONNECTING
  onopen: ((event: Event) => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onclose: ((event: CloseEvent) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.(new Event('open'))
    }, 0)
  }

  send = vi.fn()
  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED
  })
}

// Helper to access private ws property
function getWebSocket(client: SignalingClient): MockWebSocket {
  return (client as unknown as { ws: MockWebSocket }).ws
}

global.WebSocket = MockWebSocket as unknown as typeof WebSocket

describe('SignalingClient', () => {
  const url = 'ws://localhost:8080'
  const peerId = 'test-peer-123'
  let client: SignalingClient

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Connection', () => {
    it('should connect to signaling server', async () => {
      const onConnected = vi.fn()
      client = new SignalingClient(url, peerId, { onConnected })

      await client.connect()

      expect(client.isConnected()).toBe(true)
      expect(onConnected).toHaveBeenCalled()
    })

    it('should register with server on connection', async () => {
      client = new SignalingClient(url, peerId)
      await client.connect()

      const ws = getWebSocket(client)
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: MessageType.REGISTER,
          peerId,
        }),
      )
    })

    it('should disconnect from server', async () => {
      client = new SignalingClient(url, peerId)
      await client.connect()

      const ws = getWebSocket(client)
      client.disconnect()

      expect(ws.close).toHaveBeenCalled()
    })

    it('should handle disconnection callback', async () => {
      const onDisconnected = vi.fn()
      client = new SignalingClient(url, peerId, { onDisconnected })
      await client.connect()

      const ws = getWebSocket(client)
      ws.onclose?.(new CloseEvent('close'))

      expect(onDisconnected).toHaveBeenCalled()
    })
  })

  describe('Room management', () => {
    beforeEach(async () => {
      client = new SignalingClient(url, peerId)
      await client.connect()
    })

    it('should create room', () => {
      const roomId = 'test-room-1'
      client.createRoom(roomId)

      const ws = getWebSocket(client)
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: MessageType.CREATE_ROOM,
          roomId,
          peerId,
        }),
      )
    })

    it('should join room', () => {
      const roomId = 'test-room-1'
      client.joinRoom(roomId)

      const ws = getWebSocket(client)
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: MessageType.JOIN_ROOM,
          roomId,
          peerId,
        }),
      )
    })

    it('should leave room', () => {
      const roomId = 'test-room-1'
      client.leaveRoom(roomId)

      const ws = getWebSocket(client)
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: MessageType.LEAVE_ROOM,
          roomId,
          peerId,
        }),
      )
    })

    it('should handle room created callback', async () => {
      const onRoomCreated = vi.fn()
      client = new SignalingClient(url, peerId, { onRoomCreated })
      await client.connect()

      const ws = getWebSocket(client)
      const message = { type: MessageType.ROOM_CREATED, roomId: 'room-1' }
      ws.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))

      expect(onRoomCreated).toHaveBeenCalledWith('room-1')
    })

    it('should handle room joined callback', async () => {
      const onRoomJoined = vi.fn()
      client = new SignalingClient(url, peerId, { onRoomJoined })
      await client.connect()

      const ws = getWebSocket(client)
      const message = {
        type: MessageType.ROOM_JOINED,
        roomId: 'room-1',
        peers: ['peer-1', 'peer-2'],
      }
      ws.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))

      expect(onRoomJoined).toHaveBeenCalledWith('room-1', ['peer-1', 'peer-2'])
    })

    it('should handle room full callback', async () => {
      const onRoomFull = vi.fn()
      client = new SignalingClient(url, peerId, { onRoomFull })
      await client.connect()

      const ws = getWebSocket(client)
      const message = { type: MessageType.ROOM_FULL, roomId: 'room-1' }
      ws.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))

      expect(onRoomFull).toHaveBeenCalledWith('room-1')
    })
  })

  describe('Signaling messages', () => {
    beforeEach(async () => {
      client = new SignalingClient(url, peerId)
      await client.connect()
    })

    it('should send offer', () => {
      const to = 'remote-peer'
      const offer = { type: 'offer' as const, sdp: 'test-sdp' }
      client.sendOffer(to, offer)

      const ws = getWebSocket(client)
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: MessageType.OFFER,
          from: peerId,
          to,
          offer,
        }),
      )
    })

    it('should send answer', () => {
      const to = 'remote-peer'
      const answer = { type: 'answer' as const, sdp: 'test-sdp' }
      client.sendAnswer(to, answer)

      const ws = getWebSocket(client)
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: MessageType.ANSWER,
          from: peerId,
          to,
          answer,
        }),
      )
    })

    it('should send ICE candidate', () => {
      const to = 'remote-peer'
      const candidate = { candidate: 'ice-candidate', sdpMid: '0', sdpMLineIndex: 0 }
      client.sendIceCandidate(to, candidate)

      const ws = getWebSocket(client)
      expect(ws.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: MessageType.ICE_CANDIDATE,
          from: peerId,
          to,
          candidate,
        }),
      )
    })

    it('should handle received offer', async () => {
      const onOffer = vi.fn()
      client = new SignalingClient(url, peerId, { onOffer })
      await client.connect()

      const ws = getWebSocket(client)
      const offer = { type: 'offer' as const, sdp: 'remote-sdp' }
      const message = {
        type: MessageType.OFFER,
        from: 'remote-peer',
        to: peerId,
        offer,
      }
      ws.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))

      expect(onOffer).toHaveBeenCalledWith('remote-peer', offer)
    })

    it('should handle received answer', async () => {
      const onAnswer = vi.fn()
      client = new SignalingClient(url, peerId, { onAnswer })
      await client.connect()

      const ws = getWebSocket(client)
      const answer = { type: 'answer' as const, sdp: 'remote-sdp' }
      const message = {
        type: MessageType.ANSWER,
        from: 'remote-peer',
        to: peerId,
        answer,
      }
      ws.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))

      expect(onAnswer).toHaveBeenCalledWith('remote-peer', answer)
    })

    it('should handle received ICE candidate', async () => {
      const onIceCandidate = vi.fn()
      client = new SignalingClient(url, peerId, { onIceCandidate })
      await client.connect()

      const ws = getWebSocket(client)
      const candidate = { candidate: 'ice-candidate', sdpMid: '0', sdpMLineIndex: 0 }
      const message = {
        type: MessageType.ICE_CANDIDATE,
        from: 'remote-peer',
        to: peerId,
        candidate,
      }
      ws.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))

      expect(onIceCandidate).toHaveBeenCalledWith('remote-peer', candidate)
    })
  })

  describe('Peer management', () => {
    it('should handle peer list', async () => {
      const onPeerList = vi.fn()
      client = new SignalingClient(url, peerId, { onPeerList })
      await client.connect()

      const ws = getWebSocket(client)
      const message = {
        type: MessageType.PEER_LIST,
        peers: ['peer-1', 'peer-2', 'peer-3'],
      }
      ws.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))

      expect(onPeerList).toHaveBeenCalledWith(['peer-1', 'peer-2', 'peer-3'])
    })

    it('should handle peer joined', async () => {
      const onPeerJoined = vi.fn()
      client = new SignalingClient(url, peerId, { onPeerJoined })
      await client.connect()

      const ws = getWebSocket(client)
      const message = { type: MessageType.PEER_JOINED, peerId: 'new-peer' }
      ws.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))

      expect(onPeerJoined).toHaveBeenCalledWith('new-peer')
    })

    it('should handle peer left', async () => {
      const onPeerLeft = vi.fn()
      client = new SignalingClient(url, peerId, { onPeerLeft })
      await client.connect()

      const ws = getWebSocket(client)
      const message = { type: MessageType.PEER_LEFT, peerId: 'leaving-peer' }
      ws.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))

      expect(onPeerLeft).toHaveBeenCalledWith('leaving-peer')
    })
  })

  describe('Error handling', () => {
    it('should handle error messages', async () => {
      const onError = vi.fn()
      client = new SignalingClient(url, peerId, { onError })
      await client.connect()

      const ws = getWebSocket(client)
      const message = { type: MessageType.ERROR, message: 'Something went wrong' }
      ws.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))

      expect(onError).toHaveBeenCalledWith('Something went wrong')
    })

    it('should not send message when disconnected', async () => {
      client = new SignalingClient(url, peerId)
      await client.connect()

      const ws = getWebSocket(client)
      ws.readyState = MockWebSocket.CLOSED

      client.sendOffer('peer', { type: 'offer', sdp: 'sdp' })

      // Should only have the REGISTER message, not the offer
      expect(ws.send).toHaveBeenCalledTimes(1)
    })
  })

  describe('Connection state', () => {
    it('should report connected state', async () => {
      client = new SignalingClient(url, peerId)

      expect(client.isConnected()).toBe(false)

      await client.connect()

      expect(client.isConnected()).toBe(true)
    })

    it('should report disconnected state after close', async () => {
      client = new SignalingClient(url, peerId)
      await client.connect()

      client.disconnect()

      expect(client.isConnected()).toBe(false)
    })
  })
})
