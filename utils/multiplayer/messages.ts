import type { Position3D, Rotation } from './position'

/**
 * Multiplayer Message Types
 *
 * Centralized type definitions for all WebRTC messages used in multiplayer.
 * This ensures type safety and consistency across the codebase.
 */

export enum MultiplayerMessage {
  PLAYER_POSITION = 'player-position',
  PLAYER_JOINED = 'player-joined',
  PLAYER_LEFT = 'player-left',
  GAME_START = 'game-start',
}

export type PlayerPositionData = {
  position: Position3D
  rotation?: Rotation
  platformScroll: Position3D
}

export type PlayerPositionMessage = {
  type: MultiplayerMessage.PLAYER_POSITION
  from?: string
  data: PlayerPositionData
}

export type PlayerJoinedMessage = {
  type: MultiplayerMessage.PLAYER_JOINED
  from?: string
  data: {
    peerId: string
  }
}

export type PlayerLeftMessage = {
  type: MultiplayerMessage.PLAYER_LEFT
  from?: string
  data: {
    peerId: string
  }
}

export type GameStartMessage = {
  type: MultiplayerMessage.GAME_START
  from?: string
  data: {
    /** Timestamp when the game should start (synchronized) */
    startTime: number
  }
}

/** Union of all multiplayer message types */
export type MultiplayerMessageUnion =
  | PlayerPositionMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStartMessage

/**
 * Type guards for message handling
 */
export function isPlayerPositionMessage(msg: unknown): msg is PlayerPositionMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    msg.type === MultiplayerMessage.PLAYER_POSITION &&
    'data' in msg &&
    typeof msg.data === 'object'
  )
}

export function isPlayerJoinedMessage(msg: unknown): msg is PlayerJoinedMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    msg.type === MultiplayerMessage.PLAYER_JOINED
  )
}

export function isPlayerLeftMessage(msg: unknown): msg is PlayerLeftMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    msg.type === MultiplayerMessage.PLAYER_LEFT
  )
}

export function isGameStartMessage(msg: unknown): msg is GameStartMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    msg.type === MultiplayerMessage.GAME_START
  )
}
