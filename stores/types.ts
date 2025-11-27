import { type ReactNode } from 'react'
import { Vector3 } from 'three'
import { type StateCreator } from 'zustand'
import { CollectibleID, SpeedRunDatabase } from '@/model/schema'
import { type PlaySoundFX, type SoundFX } from '@/components/SoundProvider'
import type { RowData } from '@/utils/tiles'

export enum Stage {
  HOME = 1,
  INFO = 2,
  OBSTACLES = 3,
  CTA = 4,
  SPEED_RUN_FINISH = 5,
  TEST = 6,
}

export type EdgeWarningIntensities = {
  left: number
  right: number
  near: number
  far: number
}

export type PlayerInput = {
  up: number
  down: number
  left: number
  right: number
}

export type HudIndicatorConfig = {
  content: ReactNode
  autoDismissS?: number
}

export type RingIndex = [row: number, column: number]
export type RingCollection = Record<string, true>

export type SpeedRunStage = 'username' | 'countdown' | 'running' | 'submitting' | 'leaderboard'

export type TimeSlice = {
  totalTimeS: number // total time spent in the experience in seconds (persisted)
  setTotalTimeS: (seconds: number) => void

  isSpeedRunMode: boolean
  speedRunStage: SpeedRunStage
  setSpeedRunStage: (stage: SpeedRunStage) => void
  startSpeedRun: () => void // Sets mode, sets status to countdown
  onCountdownComplete: () => void // sets status to running
  finishSpeedRun: () => void // sets status to finished, submits speedrun and shows leaderboard
  stopSpeedRun: () => void

  speedRunTimeCS: number // current speed run duration in 10 milliseconds (centi-seconds)
  setSpeedRunTimeCS: (centiSeconds: number) => void

  completedSpeedRuns: SpeedRunDatabase[]
}

export type PlayerSlice = {
  username: null | string
  setUsername: (username: string) => void

  playerInput: PlayerInput
  setPlayerInput: (input: PlayerInput) => void

  playerWorldPosition: Vector3
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void

  respawnPosition: Vector3 | null
  setRespawnPosition: (pos: { x: number; y: number; z: number } | null) => void

  edgeWarningIntensities: EdgeWarningIntensities
  setEdgeWarningIntensities: (intensities: EdgeWarningIntensities) => void

  confirmingCollectible: CollectibleID | null
  setConfirmingCollectible: (collectibleType: CollectibleID | null) => void
  confirmationProgress: number

  collectedCollectibles: CollectibleID[]

  collectedRings: RingCollection
  onRingCollected: (indexes: RingIndex) => void

  respawnPlayerTick: number
  isRespawning: boolean
  setIsRespawning: (isRespawning: boolean) => void
  respawnPlayer: () => void
  stopConfirmation: () => void
  onOutOfBounds: () => void
}

export type GameSlice = {
  stage: Stage
  goToStage: (stage: Stage) => void

  hudIndicator: HudIndicatorConfig | null
  setHudIndicator: (indicator: HudIndicatorConfig | null) => void

  rowsData: RowData[]
  setRowsData: (rows: RowData[]) => void
  totalRows: number
  totalRingsCount: number
  setTotalRingsCount: (count: number) => void
  currentRow: number
  setCurrentRow: (row: number) => void

  cameraLookAtPosition: Vector3 | null
  setCameraLookAtPosition: (pos: Vector3 | null) => void

  resetPlatformTick: number

  isPlatformReady: boolean
  setPlatformReady: (isReady: boolean) => void

  resetGame: ({
    isSpeedRunMode,
    speedRunStage,
  }: {
    isSpeedRunMode: boolean
    speedRunStage?: SpeedRunStage
  }) => void

  htmlPortal: undefined | React.RefObject<HTMLDivElement>
  setHtmlPortal: (ref: undefined | React.RefObject<HTMLDivElement>) => void

  _isHydrated: boolean
  setHydrated: () => void
}

export type GameStore = TimeSlice & PlayerSlice & GameSlice

export type SliceDeps = {
  playSoundFX: PlaySoundFX
  stopSoundFX: (fx: SoundFX) => void
}

export type GameSliceCreator<T> = StateCreator<GameStore, [['zustand/persist', unknown]], [], T>
