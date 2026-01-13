import type { Position3D, Rotation } from './coordinates'

/**
 * Multiplayer Message Types
 *
 * Centralized type definitions for all WebRTC messages used in multiplayer.
 * This ensures type safety and consistency across the codebase.
 */

export type PlayerPositionData = {
  position: Position3D
  rotation?: Rotation
  platformScroll: Position3D
}

export type PlayerPositionMessage = {
  type: 'player-position'
  from: string
  data: PlayerPositionData
}

export type PlayerJoinedMessage = {
  type: 'player-joined'
  data: {
    peerId: string
  }
}

export type PlayerLeftMessage = {
  type: 'player-left'
  data: {
    peerId: string
  }
}

export type GameStartMessage = {
  type: 'game-start'
  data: {
    /** Timestamp when the game should start (synchronized) */
    startTime: number
  }
}

export type MultiplayerMessage =
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
    msg.type === 'player-position' &&
    'data' in msg &&
    typeof msg.data === 'object'
  )
}

export function isPlayerJoinedMessage(msg: unknown): msg is PlayerJoinedMessage {
  return (
    typeof msg === 'object' && msg !== null && 'type' in msg && msg.type === 'player-joined'
  )
}

export function isPlayerLeftMessage(msg: unknown): msg is PlayerLeftMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg && msg.type === 'player-left'
}

export function isGameStartMessage(msg: unknown): msg is GameStartMessage {
  return typeof msg === 'object' && msg !== null && 'type' in msg && msg.type === 'game-start'
}
