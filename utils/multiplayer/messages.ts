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
  RACE_FINISHED = 'race-finished',
  RACE_ENDED = 'race-ended',
  RACE_PAUSED = 'race-paused',
  RACE_RESUMED = 'race-resumed',
  RACE_RESTART = 'race-restart',
}

export type PlayerPositionData = {
  position: Position3D
  rotation?: Rotation
  platformScroll: Position3D
}

/**
 * Base type for all multiplayer messages
 */
export type BaseMultiplayerMessage<
  T extends MultiplayerMessage,
  D = Record<string, unknown>,
> = {
  type: T
  from?: string
  data: D
}

export type PlayerPositionMessage = BaseMultiplayerMessage<
  MultiplayerMessage.PLAYER_POSITION,
  PlayerPositionData
>

export type PlayerJoinedMessage = BaseMultiplayerMessage<
  MultiplayerMessage.PLAYER_JOINED,
  {
    peerId: string
  }
>

export type PlayerLeftMessage = BaseMultiplayerMessage<
  MultiplayerMessage.PLAYER_LEFT,
  {
    peerId: string
  }
>

export type GameStartMessage = BaseMultiplayerMessage<
  MultiplayerMessage.GAME_START,
  {
    /** Timestamp when the game should start (synchronized) */
    startTime: number
  }
>

export type RaceFinishedMessage = BaseMultiplayerMessage<
  MultiplayerMessage.RACE_FINISHED,
  {
    /** Time in centiseconds */
    timeCS: number
  }
>

export type RaceEndedMessage = BaseMultiplayerMessage<
  MultiplayerMessage.RACE_ENDED,
  {
    peerId: string
  }
>

export type RacePausedMessage = BaseMultiplayerMessage<
  MultiplayerMessage.RACE_PAUSED,
  {
    peerId: string
  }
>

export type RaceResumedMessage = BaseMultiplayerMessage<
  MultiplayerMessage.RACE_RESUMED,
  {
    peerId: string
  }
>

export type RaceRestartMessage = BaseMultiplayerMessage<
  MultiplayerMessage.RACE_RESTART,
  {
    /** Whether to restart from current position (true) or from beginning (false) */
    fromCurrentPosition: boolean
    /** Timestamp when the race should restart (synchronized) */
    startTime: number
  }
>

/** Union of all multiplayer message types */
export type MultiplayerMessageUnion =
  | PlayerPositionMessage
  | PlayerJoinedMessage
  | PlayerLeftMessage
  | GameStartMessage
  | RaceFinishedMessage
  | RaceEndedMessage
  | RacePausedMessage
  | RaceResumedMessage
  | RaceRestartMessage

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

export function isRaceFinishedMessage(msg: unknown): msg is RaceFinishedMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    msg.type === MultiplayerMessage.RACE_FINISHED
  )
}

export function isRaceEndedMessage(msg: unknown): msg is RaceEndedMessage {
  return (
    typeof msg === 'object' &&
    msg !== null &&
    'type' in msg &&
    msg.type === MultiplayerMessage.RACE_ENDED
  )
}
