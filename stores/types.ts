import { type ReactNode } from 'react'
import { type Vector3Tuple } from 'three'
import { type StateCreator } from 'zustand'

import { type PlaySoundFX, type SoundFX } from '@/components/SoundProvider'
import { CollectibleID, SpeedRunDatabase } from '@/model/schema'
import type { TotalCounts } from '@/stores/totalCounts'
import type { RowData } from '@/utils/tiles'

export enum Stage {
  HOME = 1,
  INFO = 2,
  OBSTACLES = 3,
  CTA = 4,
  SPEED_RUN_FINISH = 5,
}

export type PlayerInput = {
  up: number
  down: number
  left: number
  right: number
}

export type PlayerStatus = 'idle' | 'safe' | 'out-of-bounds' | 'respawning'

export type HudIndicatorConfig = {
  id: string
  content: ReactNode
  autoDismissS?: number
}

export type RingIndex = [row: number, column: number]
export type RingCollection = Record<string, true>

export type SpeedRunStage = 'username' | 'countdown' | 'running' | 'submitting' | 'leaderboard'

export enum GameMode {
  MAIN = 'main',
  TEST = 'test',
  SPEEDRUN = 'speedrun',
}

export type TimeSlice = {
  totalTimeS: number // total time spent in the experience in seconds (persisted)
  setTotalTimeS: (seconds: number) => void

  speedRunStage: SpeedRunStage
  setSpeedRunStage: (stage: SpeedRunStage) => void
  startSpeedRun: () => void // Sets mode, sets status to countdown
  onCountdownComplete: () => void // sets status to running
  finishSpeedRun: () => void // sets status to finished, submits speedrun and shows leaderboard

  speedRunTimeCS: number // current speed run duration in 10 milliseconds (centi-seconds)
  setSpeedRunTimeCS: (centiSeconds: number) => void

  completedSpeedRuns: SpeedRunDatabase[]
}

export enum InputType {
  KEYS = 'k',
  JOYSTICK = 'j',
}

export type InputSlice = {
  inputType: InputType
  setInputType: (type: InputType) => void
  joystickPosition: 'left' | 'right'
  setJoystickPosition: (position: 'left' | 'right') => void
  playerInput: PlayerInput
  setPlayerInput: (input: PlayerInput) => void
}

export type PlayerSlice = {
  username: null | string
  setUsername: (username: string) => void

  playerPosition: Vector3Tuple
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void

  spawnPosition: Vector3Tuple | null
  playerRespawnTick: number
  playerStatus: PlayerStatus

  respawnPlayer: (position: Vector3Tuple, hud?: HudIndicatorConfig) => void
  onRespawnComplete: () => void

  confirmingCollectible: CollectibleID | null
  setConfirmingCollectible: (collectibleType: CollectibleID | null) => void
  confirmationProgress: number

  collectedCollectibles: CollectibleID[]

  collectedRings: RingCollection
  onRingCollected: (indexes: RingIndex) => void

  stopConfirmation: () => void
  onOutOfBounds: (options?: { silent?: boolean }) => void
}

export type GameSlice = {
  stage: Stage
  goToStage: (stage: Stage) => void

  hudIndicator: HudIndicatorConfig | null
  setHudIndicator: (indicator: HudIndicatorConfig | null) => void

  rowsData: RowData[]
  totalCounts: TotalCounts
  setRowsData: (rows: RowData[], totalCounts: TotalCounts) => void

  currentRow: number
  setCurrentRow: (row: number) => void

  mode: GameMode
  resetGame: (params: { mode: GameMode; speedRunStage?: SpeedRunStage }) => void

  cameraLookAtPosition: Vector3Tuple | null
  setCameraLookAtPosition: (pos: Vector3Tuple | null) => void

  resetPlatformTick: number

  isPlatformReady: boolean
  setPlatformReady: (isReady: boolean) => void

  isShowingLoadingOverlay: boolean
  setIsShowingLoadingOverlay: (isVisible: boolean) => void

  htmlPortal: undefined | React.RefObject<HTMLDivElement>
  setHtmlPortal: (ref: undefined | React.RefObject<HTMLDivElement>) => void

  _isHydrated: boolean
  setHydrated: () => void
}

export type GameStore = TimeSlice & PlayerSlice & GameSlice & InputSlice

export type SliceDeps = {
  isMobile: boolean
  playSoundFX: PlaySoundFX
  stopSoundFX: (fx: SoundFX) => void
}

export type GameSliceCreator<T> = StateCreator<GameStore, [['zustand/persist', unknown]], [], T>
