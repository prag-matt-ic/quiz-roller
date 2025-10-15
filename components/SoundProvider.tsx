'use client'
import { createContext, type FC, type PropsWithChildren, useContext, useEffect, useRef } from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

export enum SoundFX {
  GET_READY = 'GET_READY',
  COUNTDOWN = 'COUNTDOWN',
  CORRECT_ANSWER = 'CORRECT_ANSWER',
  WRONG_ANSWER = 'WRONG_ANSWER',
  OBSTACLE_HIT = 'OBSTACLE_HIT',
  OBSTACLE_AVOIDED = 'OBSTACLE_AVOIDED',
  GAME_OVER = 'GAME_OVER',
  LEVEL_COMPLETE = 'LEVEL_COMPLETE',
}

const SOUND_FILES: Record<SoundFX, string> = {
  [SoundFX.GET_READY]: '/audio/mixkit-retro-car-engine-glitch-2712.wav',
  [SoundFX.COUNTDOWN]: '/audio/mixkit-simple-game-countdown-921.wav',
  [SoundFX.GAME_OVER]: '/audio/mixkit-player-losing-or-failing-2042.wav',
  [SoundFX.LEVEL_COMPLETE]: '/audio/mixkit-ethereal-fairy-win-sound-2019.wav',
  [SoundFX.CORRECT_ANSWER]: '/audio/mixkit-fantasy-game-success-notification-270.wav',
  [SoundFX.WRONG_ANSWER]: '/audio/mixkit-wrong-answer-bass-buzzer-948.wav',
  [SoundFX.OBSTACLE_AVOIDED]: '/audio/mixkit-futuristic-sweep-pass-by-169.wav',
  [SoundFX.OBSTACLE_HIT]: '/audio/mixkit-8-bit-bomb-explosion-2811.wav',
}

type Buffers = Partial<Record<SoundFX, AudioBuffer>>

type SoundState = {
  isLoading: boolean
  initialise: () => Promise<void>
  playSoundFX: (fx: SoundFX) => void
  setMasterGain: (v: number) => void
}

type SoundStore = StoreApi<SoundState>
const SoundContext = createContext<SoundStore>(undefined!)

const createSoundStore = () => {
  let audioContext: AudioContext | null = null
  let master: GainNode | null = null
  let buffers: Buffers = {}
  let ready: Promise<void> | null = null

  async function ensureContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      master = audioContext.createGain()
      master.connect(audioContext.destination)
      master.gain.value = 0.5
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    return { audioContext, master }
  }

  async function loadAllSounds(): Promise<void> {
    const { audioContext } = await ensureContext()
    const entries: [SoundFX, AudioBuffer][] = []

    await Promise.all(
      Object.entries(SOUND_FILES).map(async ([fx, url]) => {
        try {
          const response = await fetch(url)
          if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
          entries.push([fx as SoundFX, audioBuffer])
        } catch (event) {
          console.error('[SoundProvider] Failed to load', fx, url, event)
        }
      }),
    )

    buffers = Object.fromEntries(entries)
  }

  return createStore<SoundState>()((set, get) => ({
    isLoading: true,

    initialise: async () => {
      if (!ready) ready = loadAllSounds().finally(() => set({ isLoading: false }))
      await ready
    },

    playSoundFX: (fx: SoundFX) => {
      const run = async () => {
        await ensureContext() // ensure resumed after a gesture (or later)
        if (!buffers[fx]) {
          // try to lazy-load if not loaded yet
          await get().initialise()
        }
        const audioBuffer = buffers[fx]
        if (!audioBuffer) {
          console.warn(`[SoundProvider] Missing buffer for ${fx} after init`)
          return
        }
        const src = audioContext!.createBufferSource()
        src.buffer = audioBuffer
        src.connect(master!)
        src.onended = () => {
          try {
            src.disconnect()
          } catch {}
        }
        src.start(0)
      }

      run().catch((err) => console.warn(`[SoundProvider] Failed to play ${fx}`, err))
    },

    setMasterGain: (v: number) => {
      if (master) {
        master.gain.value = Math.max(0, Math.min(1, v))
      }
    },
  }))
}

export const SoundProvider: FC<PropsWithChildren> = ({ children }) => {
  const soundStore = useRef<SoundStore>(createSoundStore())

  useEffect(() => {
    const initialiseAudio = async () => {
      try {
        const { initialise } = soundStore.current.getState()
        await initialise()
      } catch (error) {
        console.error('[SoundProvider] Audio initialisation failed', error)
      }
    }
    initialiseAudio()
  }, [])

  return <SoundContext.Provider value={soundStore.current}>{children}</SoundContext.Provider>
}

export function useSoundStore<T>(selector: (state: SoundState) => T): T {
  const soundStore = useContext(SoundContext)
  if (!soundStore) throw new Error('Missing SoundContext.Provider in the tree')
  return useStore(soundStore, selector)
}
