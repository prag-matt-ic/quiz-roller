import gsap from 'gsap'
import { Vector3, type Vector3Tuple } from 'three'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { SoundFX } from '@/components/SoundProvider'
import { COLLECTIBLES_HUD_CONFIG } from '@/resources/content'
import { CollectibleType } from '@/model/schema'
import { GameSliceCreator, PlayerSlice, SliceDeps, type RingIndex } from './types'
import { ringIndexToKey } from '@/utils/rings'

export const PLAYER_INITIAL_POSITION: Vector3Tuple = [0.0, PLAYER_RADIUS + 4, 0]
export const PLAYER_INITIAL_POSITION_VEC3 = new Vector3(
  PLAYER_INITIAL_POSITION[0],
  PLAYER_INITIAL_POSITION[1],
  PLAYER_INITIAL_POSITION[2],
)

const COLLECTIBLE_DURATION_S = 1.0

const clampEdgeWarningValue = (value: number) => Math.min(1, Math.max(0, value))

export const INITIAL_PLAYER_STATE = {
  username: 'testing',
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
  resetPlayerTick: 0,
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
      setConfirmingCollectible: (collectibleType: CollectibleType | null) => {
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
      resetPlayer: () => {
        set((s) => ({
          playerWorldPosition: PLAYER_INITIAL_POSITION_VEC3.clone(),
          resetPlayerTick: s.resetPlayerTick + 1,
        }))
      },
      stopConfirmation: () => {
        confirmationTween?.kill()
        confirmationTween = null
        confirmationTweenTarget.value = 0
      },
      onOutOfBounds: () => {
        playSoundFX(SoundFX.OUT_OF_BOUNDS)
        get().resetPlayer()
      },
    }
  }
