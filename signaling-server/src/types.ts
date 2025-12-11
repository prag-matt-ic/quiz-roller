/**
 * Signaling message types for WebRTC peer connection establishment
 */

// WebRTC types for Node.js environment
export type RTCSessionDescriptionInit = {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback'
  sdp?: string
}

export type RTCIceCandidateInit = {
  candidate?: string
  sdpMLineIndex?: number | null
  sdpMid?: string | null
  usernameFragment?: string | null
}

export enum MessageType {
  // Connection management
  REGISTER = 'register',
  PEER_LIST = 'peer-list',
  PEER_JOINED = 'peer-joined',
  PEER_LEFT = 'peer-left',

  // WebRTC signaling
  OFFER = 'offer',
  ANSWER = 'answer',
  ICE_CANDIDATE = 'ice-candidate',

  // Room management
  CREATE_ROOM = 'create-room',
  JOIN_ROOM = 'join-room',
  LEAVE_ROOM = 'leave-room',
  ROOM_CREATED = 'room-created',
  ROOM_JOINED = 'room-joined',
  ROOM_FULL = 'room-full',

  // Errors
  ERROR = 'error',
}

export type SignalingMessage =
  | RegisterMessage
  | PeerListMessage
  | PeerJoinedMessage
  | PeerLeftMessage
  | OfferMessage
  | AnswerMessage
  | IceCandidateMessage
  | CreateRoomMessage
  | JoinRoomMessage
  | LeaveRoomMessage
  | RoomCreatedMessage
  | RoomJoinedMessage
  | RoomFullMessage
  | ErrorMessage

export type RegisterMessage = {
  type: MessageType.REGISTER
  peerId: string
}

export type PeerListMessage = {
  type: MessageType.PEER_LIST
  peers: string[]
}

export type PeerJoinedMessage = {
  type: MessageType.PEER_JOINED
  peerId: string
}

export type PeerLeftMessage = {
  type: MessageType.PEER_LEFT
  peerId: string
}

export type OfferMessage = {
  type: MessageType.OFFER
  from: string
  to: string
  offer: RTCSessionDescriptionInit
}

export type AnswerMessage = {
  type: MessageType.ANSWER
  from: string
  to: string
  answer: RTCSessionDescriptionInit
}

export type IceCandidateMessage = {
  type: MessageType.ICE_CANDIDATE
  from: string
  to: string
  candidate: RTCIceCandidateInit
}

export type CreateRoomMessage = {
  type: MessageType.CREATE_ROOM
  roomId: string
  peerId: string
}

export type JoinRoomMessage = {
  type: MessageType.JOIN_ROOM
  roomId: string
  peerId: string
}

export type LeaveRoomMessage = {
  type: MessageType.LEAVE_ROOM
  roomId: string
  peerId: string
}

export type RoomCreatedMessage = {
  type: MessageType.ROOM_CREATED
  roomId: string
}

export type RoomJoinedMessage = {
  type: MessageType.ROOM_JOINED
  roomId: string
  peers: string[]
}

export type RoomFullMessage = {
  type: MessageType.ROOM_FULL
  roomId: string
}

export type ErrorMessage = {
  type: MessageType.ERROR
  message: string
}
