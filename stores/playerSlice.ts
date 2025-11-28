import gsap from 'gsap'
import { Vector3, type Vector3Tuple } from 'three'

import { SoundFX } from '@/components/SoundProvider'
import { CollectibleID } from '@/model/schema'
import { COLLECTIBLES_HUD_CONFIG } from '@/resources/content'
import { ringIndexToKey } from '@/utils/rings'

import {
  GameSliceCreator,
  PlayerSlice,
  type PlayerStatus,
  type RingIndex,
  SliceDeps,
} from './types'

export const PLAYER_INITIAL_POSITION: Vector3Tuple = [0.0, 4.5, 0]

export const PLAYER_INITIAL_POSITION_VEC3 = new Vector3(
  PLAYER_INITIAL_POSITION[0],
  PLAYER_INITIAL_POSITION[1],
  PLAYER_INITIAL_POSITION[2],
)

const COLLECTIBLE_DURATION_S = 1.5

const clampEdgeWarningValue = (value: number) => Math.min(1, Math.max(0, value))

const logPlayerStatus = (event: string, payload?: Record<string, unknown>): void => {
  if (process.env.NODE_ENV === 'production') return
  if (payload) {
    console.warn(`[PlayerStore] ${event}`, payload)
    return
  }
  console.warn(`[PlayerStore] ${event}`)
}

export const INITIAL_PLAYER_STATE = {
  playerInput: {
    up: 0,
    down: 0,
    left: 0,
    right: 0,
  },
  edgeWarningIntensities: {
    left: 0,
    right: 0,
    near: 0,
    far: 0,
  },
  confirmingCollectible: null,
  collectedCollectibles: [],
  collectedRings: {},
  confirmationProgress: 0,
  respawnPosition: null,
  playerStatus: 'normal' as PlayerStatus,
}

export const createPlayerSlice =
  ({ playSoundFX, stopSoundFX }: SliceDeps): GameSliceCreator<PlayerSlice> =>
  (set, get) => {
    let confirmationTween: gsap.core.Tween | null = null
    const confirmationTweenTarget = { value: 0 }

    function startConfirmation(onComplete: () => void, duration: number) {
      confirmationTweenTarget.value = 0
      confirmationTween = gsap.fromTo(
        confirmationTweenTarget,
        { value: 0 },
        {
          duration,
          ease: 'none',
          value: 1,
          onUpdate: () => {
            set({ confirmationProgress: confirmationTweenTarget.value })
          },
          onComplete: () => {
            onComplete()
            confirmationTween?.kill()
            confirmationTween = null
          },
        },
      )
    }

    function cancelConfirmation() {
      set({
        confirmingCollectible: null,
      })
      confirmationTween = gsap.to(confirmationTweenTarget, {
        duration: 0.3,
        ease: 'power2.out',
        value: 0,
        onUpdate: () => {
          set({ confirmationProgress: confirmationTweenTarget.value })
        },
        onComplete: () => {
          confirmationTweenTarget.value = 0
          confirmationTween?.kill()
          confirmationTween = null
        },
      })
    }

    return {
      ...INITIAL_PLAYER_STATE,
      username: null,
      setUsername: (username: string) => {
        set({ username })
      },
      playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3.clone(),
      setPlayerInput(input) {
        set({ playerInput: input })
      },
      setPlayerPosition: (position) => {
        set((s) => ({
          playerWorldPosition: s.playerWorldPosition.set(position.x, position.y, position.z),
        }))
      },
      setEdgeWarningIntensities: (intensities) => {
        set({
          edgeWarningIntensities: {
            left: clampEdgeWarningValue(intensities.left),
            right: clampEdgeWarningValue(intensities.right),
            near: clampEdgeWarningValue(intensities.near),
            far: clampEdgeWarningValue(intensities.far),
          },
        })
      },
      onRingCollected: (ringIndex: RingIndex) => {
        const ringKey = ringIndexToKey(ringIndex)
        if (get().collectedRings[ringKey]) return
        set((s) => ({
          collectedRings: {
            ...s.collectedRings,
            [ringKey]: true,
          },
        }))
        playSoundFX(SoundFX.COIN_COLLECTED)
      },
      setConfirmingCollectible: (collectibleType: CollectibleID | null) => {
        confirmationTween?.kill()

        if (collectibleType === null) {
          cancelConfirmation()
          set({ confirmingCollectible: null })
          stopSoundFX(SoundFX.CHANGE_COLOUR)
          return
        }

        // Don't re-confirm already collected
        if (get().collectedCollectibles.includes(collectibleType)) return

        set({
          confirmingCollectible: collectibleType,
          confirmationProgress: 0,
        })

        playSoundFX(SoundFX.CHANGE_COLOUR)

        const onConfirmed = () => {
          const currentConfirming = get().confirmingCollectible
          if (currentConfirming !== collectibleType) return
          set((s) => ({
            collectedCollectibles: [...s.collectedCollectibles, collectibleType],
            confirmingCollectible: null,
            hudIndicator: COLLECTIBLES_HUD_CONFIG[currentConfirming],
          }))
          playSoundFX(SoundFX.OPEN_INFO)
        }

        startConfirmation(onConfirmed, COLLECTIBLE_DURATION_S)
      },
      stopConfirmation: () => {
        confirmationTween?.kill()
        confirmationTween = null
        confirmationTweenTarget.value = 0
      },
      respawnPlayer: (position) => {
        set({
          playerStatus: 'respawning',
          respawnPosition: new Vector3(position.x, position.y, position.z),
        })
        logPlayerStatus('Respawn queued', position)
      },
      onRespawnComplete: () => {
        set({
          playerStatus: 'normal',
          respawnPosition: null,
        })
        logPlayerStatus('Respawn complete')
      },
      onOutOfBounds: () => {
        playSoundFX(SoundFX.OUT_OF_BOUNDS)
        set({
          playerStatus: 'out-of-bounds',
          respawnPosition: null,
          playerInput: {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
          },
          collectedRings: {},
        })
        logPlayerStatus('Player out of bounds')
      },
    }
  }
