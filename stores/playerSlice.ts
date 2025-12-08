import gsap from 'gsap'
import { type Vector3Tuple } from 'three'

import { SoundFX } from '@/components/SoundProvider'
import { CollectibleID } from '@/model/schema'
import { OUT_OF_BOUNDS_HUD_CONFIG } from '@/resources/content/hud'
import { ringIndexToKey } from '@/utils/rings'

import {
  type GameSliceCreator,
  type PlayerSlice,
  type PlayerStatus,
  RingCollection,
  type RingIndex,
  SliceDeps,
} from './types'

export const PLAYER_INITIAL_POSITION: Vector3Tuple = [0, 4, 0]
export const PLAYER_SPEED_BASE = 8.0 // units per second
export const PLAYER_SPEED_MAX = 11.0
const RING_SPEED_INCREMENT = 0.5
const SPEED_COOLDOWN_S = 6.0
const COLLECTIBLE_DURATION_S = 1.5

export const RESET_PLAYER_STATE: Pick<
  PlayerSlice,
  | 'confirmingCollectible'
  | 'collectedRings'
  | 'confirmationProgress'
  | 'hasCollectedAllRings'
  | 'playerSpeedUnits'
> = {
  confirmingCollectible: null,
  collectedRings: {},
  confirmationProgress: 0,
  hasCollectedAllRings: false,
  playerSpeedUnits: PLAYER_SPEED_BASE,
}

export const createPlayerSlice =
  ({ playSoundFX, stopSoundFX }: SliceDeps): GameSliceCreator<PlayerSlice> =>
  (set, get) => {
    let confirmationTween: GSAPTween | null = null
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

    let speedTween: GSAPTween | null = null
    let speedDecayTween: GSAPTween | null = null
    const speedTweenTarget = { value: PLAYER_SPEED_BASE }

    function increaseSpeed(increment: number) {
      speedDecayTween?.kill()
      speedTween?.kill()
      const targetValue = Math.min(PLAYER_SPEED_MAX, speedTweenTarget.value + increment)
      speedTween = gsap.to(speedTweenTarget, {
        duration: 0.25,
        ease: 'none',
        value: targetValue,
        onUpdate: () => {
          set({ playerSpeedUnits: speedTweenTarget.value })
        },
        onComplete: () => {
          speedDecayTween = gsap.to(speedTweenTarget, {
            duration: SPEED_COOLDOWN_S,
            ease: 'none',
            value: PLAYER_SPEED_BASE,
            onUpdate: () => {
              set({ playerSpeedUnits: speedTweenTarget.value })
            },
          })
        },
      })
    }

    function resetSpeed() {
      speedDecayTween?.kill()
      speedTween?.kill()
      speedTween = gsap.to(speedTweenTarget, {
        duration: 0.25,
        ease: 'none',
        value: PLAYER_SPEED_BASE,
        onUpdate: () => {
          set({ playerSpeedUnits: speedTweenTarget.value })
        },
      })
    }

    return {
      ...RESET_PLAYER_STATE,
      collectedCollectibles: [],
      playerRespawnTick: 0,
      spawnPosition: null,
      playerStatus: 'idle' as PlayerStatus,
      fallCount: 0,
      username: null,
      setUsername: (username: string) => {
        set({ username })
      },
      playerPosition: PLAYER_INITIAL_POSITION,
      setPlayerPosition: (position) => {
        set({
          playerPosition: [position.x, position.y, position.z],
        })
      },
      onRingCollected: (ringIndex: RingIndex) => {
        const ringKey = ringIndexToKey(ringIndex)
        if (get().collectedRings[ringKey]) return
        const totalRingsCount = get().totalCounts.rings
        const newCollectedRings: RingCollection = { ...get().collectedRings, [ringKey]: true }

        const playerRingsCount = Object.keys(newCollectedRings).length
        const hasCollectedAllRings = playerRingsCount >= totalRingsCount
        if (hasCollectedAllRings) {
          console.warn('[PlayerStore] All rings collected!')
        }

        increaseSpeed(RING_SPEED_INCREMENT)

        set({ collectedRings: newCollectedRings, hasCollectedAllRings })
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
            hudIndicator: null,
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
      respawnPlayer: (position, hud) => {
        let hudIndicator = hud
        // If no hud provided, pick a random one from out-of-bounds configs
        // TODO: read outOfBoundsEvents, try to a pick HUD message that hasn't been used recently
        if (!hud) {
          hudIndicator =
            OUT_OF_BOUNDS_HUD_CONFIG[
              Math.floor(Math.random() * OUT_OF_BOUNDS_HUD_CONFIG.length)
            ]
        }

        set((s) => ({
          playerStatus: 'respawning',
          playerRespawnTick: s.playerRespawnTick + 1,
          spawnPosition: position,
          hudIndicator: hudIndicator,
        }))
      },
      onRespawnComplete: () => {
        set({
          playerStatus: 'safe',
        })
      },
      onOutOfBounds: () => {
        playSoundFX(SoundFX.OUT_OF_BOUNDS)
        resetSpeed()
        set((s) => ({
          playerStatus: 'out-of-bounds',
          spawnPosition: null, // Calculated in usePlayerRespawn hook
          fallCount: s.fallCount + 1,
          playerInput: {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
          },
          playerInputIntent: {
            up: 0,
            down: 0,
            left: 0,
            right: 0,
          },
          collectedRings: {},
          hasCollectedAllRings: false,
        }))
      },
    }
  }
