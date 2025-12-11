import { beforeAll, vi } from 'vitest'

// Mock WebRTC APIs that aren't available in test environment
beforeAll(() => {
  // Mock RTCPeerConnection
  const RTCPeerConnectionMock = vi.fn().mockImplementation(() => ({
    localDescription: null,
    remoteDescription: null,
    signalingState: 'stable',
    iceConnectionState: 'new',
    connectionState: 'new',
    iceGatheringState: 'new',

    createOffer: vi.fn().mockResolvedValue({
      type: 'offer',
      sdp: 'mock-sdp-offer',
    }),

    createAnswer: vi.fn().mockResolvedValue({
      type: 'answer',
      sdp: 'mock-sdp-answer',
    }),

    setLocalDescription: vi.fn().mockResolvedValue(undefined),
    setRemoteDescription: vi.fn().mockResolvedValue(undefined),
    addIceCandidate: vi.fn().mockResolvedValue(undefined),

    createDataChannel: vi.fn().mockReturnValue({
      label: 'test-channel',
      readyState: 'connecting',
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onopen: null,
      onclose: null,
      onerror: null,
      onmessage: null,
    }),

    close: vi.fn(),

    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),

    onicecandidate: null,
    onconnectionstatechange: null,
    onsignalingstatechange: null,
    ondatachannel: null,
    onicecandidateerror: null,
  }))

  // Add static method to the mock constructor
  Object.assign(RTCPeerConnectionMock, {
    generateCertificate: vi.fn().mockResolvedValue({
      expires: Date.now() + 86400000,
      getFingerprints: vi.fn().mockReturnValue([]),
    }),
  })

  global.RTCPeerConnection = RTCPeerConnectionMock as unknown as typeof RTCPeerConnection

  // Mock RTCSessionDescription
  global.RTCSessionDescription = vi
    .fn()
    .mockImplementation((init) => init) as unknown as typeof RTCSessionDescription

  // Mock RTCIceCandidate
  global.RTCIceCandidate = vi
    .fn()
    .mockImplementation((init) => init) as unknown as typeof RTCIceCandidate
})
