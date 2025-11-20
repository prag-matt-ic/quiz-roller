import { type ReactNode } from 'react'
import { Vector3, type Vector3Tuple } from 'three'
import { type StateCreator } from 'zustand'
import { CollectibleType } from '@/model/schema'
import { type PlaySoundFX, type SoundFX } from '@/components/SoundProvider'

export enum Stage {
  HOME = 'home',
  INFO = 'info',
  TERRAIN = 'terrain',
  CTA = 'cta',
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

export interface TimeSlice {
  totalTimeS: number // total time spent in the experience in seconds (persisted)
  setTotalTimeS: (seconds: number) => void

  isSpeedRunMode: boolean
  startSpeedRun: () => void
  stopSpeedRun: () => void
  restartSpeedRun: () => void
  finishSpeedRun: () => void

  speedRunTimeCS: number // current speed run duration in 10 milliseconds (centi-seconds)
  setSpeedRunTimeCS: (centiSeconds: number) => void

  isSpeedRunTiming: boolean
  setIsSpeedRunTiming: (isTiming: boolean) => void

  completedSpeedRuns: { speedRunTimeCS: number; date: string }[]
}

export type PlayerSlice = {
  username: null | string
  setUsername: (username: string) => void

  playerInput: PlayerInput
  setPlayerInput: (input: PlayerInput) => void

  playerWorldPosition: Vector3
  setPlayerPosition: (pos: { x: number; y: number; z: number }) => void

  edgeWarningIntensities: EdgeWarningIntensities
  setEdgeWarningIntensities: (intensities: EdgeWarningIntensities) => void

  confirmingCollectible: CollectibleType | null
  setConfirmingCollectible: (collectibleType: CollectibleType | null) => void
  confirmationProgress: number

  collectedCollectibles: CollectibleType[]

  collectedRings: RingIndex[]
  onRingCollected: (indexes: RingIndex) => void

  resetPlayerTick: number
  resetPlayer: (position?: Vector3Tuple) => void
  stopConfirmation: () => void
  onOutOfBounds: () => void
}

export type GameSlice = {
  stage: Stage
  goToStage: (stage: Stage) => void

  infoContentIndex: number
  setInfoContentIndex: (index: number) => void

  paletteIndex: 0 | 1 | 2

  hudIndicator: HudIndicatorConfig | null
  setHudIndicator: (indicator: HudIndicatorConfig | null) => void

  totalRows: number
  setTotalRows: (rows: number) => void
  currentRow: number
  setCurrentRow: (row: number) => void

  cameraLookAtPosition: Vector3 | null
  setCameraLookAtPosition: (pos: Vector3 | null) => void

  resetPlatformTick: number
  resetGame: () => void

  _isHydrated: boolean
  setHydrated: () => void
}

export type GameStore = TimeSlice & PlayerSlice & GameSlice

export type SliceDeps = {
  playSoundFX: PlaySoundFX
  stopSoundFX: (fx: SoundFX) => void
}

export type GameSliceCreator<T> = StateCreator<
  GameStore,
  [
    ['zustand/subscribeWithSelector', never],
    ['zustand/persist', Pick<GameStore, 'paletteIndex' | 'totalTimeS'>],
  ],
  [],
  T
>
