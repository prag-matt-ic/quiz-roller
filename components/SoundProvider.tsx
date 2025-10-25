'use client'
import {
  createContext,
  type FC,
  type PropsWithChildren,
  useContext,
  useEffect,
  useRef,
} from 'react'
import { createStore, type StoreApi, useStore } from 'zustand'

export enum SoundFX {
  BACKGROUND = 'BACKGROUND',
  CONFIRMED = 'CONFIRMED',
  CORRECT_ANSWER = 'CORRECT_ANSWER',
  INCORRECT_ANSWER = 'WRONG_ANSWER',
  GAME_OVER = 'GAME_OVER',
}

const SOUND_FILES: Record<SoundFX, string> = {
  [SoundFX.CONFIRMED]: '/audio/center.aac',
  [SoundFX.GAME_OVER]: '/audio/background.aac',
  [SoundFX.BACKGROUND]: '/audio/background.aac',
  [SoundFX.CORRECT_ANSWER]: '/audio/background.aac',
  [SoundFX.INCORRECT_ANSWER]: '/audio/background.aac',
}

type Buffers = Partial<Record<SoundFX, AudioBuffer>>

type SoundState = {
  isLoading: boolean
  isMuted: boolean
  setIsMuted: (isMuted: boolean) => void
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
    isMuted: true,

    initialise: async () => {
      if (!ready) ready = loadAllSounds().finally(() => set({ isLoading: false }))
      await ready
    },

    setIsMuted: (isMuted: boolean) => {
      set({ isMuted })
      get().setMasterGain(isMuted ? 0 : 0.5)
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
        await soundStore.current.getState().initialise()
      } catch (error) {
        console.error('[SoundProvider] Audio initialisation failed', error)
      }
    }
    initialiseAudio()
  }, [])

  return <SoundContext value={soundStore.current}>{children}</SoundContext>
}

export function useSoundStore<T>(selector: (state: SoundState) => T): T {
  const soundStore = useContext(SoundContext)
  if (!soundStore) throw new Error('Missing SoundContext.Provider in the tree')
  return useStore(soundStore, selector)
}
