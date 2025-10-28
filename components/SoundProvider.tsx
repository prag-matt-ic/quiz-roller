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
  CORRECT_ANSWER = 'CORRECT_ANSWER',
  INCORRECT_ANSWER = 'WRONG_ANSWER',
  GAME_OVER = 'GAME_OVER',
  OPEN_INFO = 'OPEN_INFO',
  CHANGE_COLOUR = 'CHANGE_COLOUR',
}

const SOUND_FILES: Record<SoundFX, string> = {
  [SoundFX.GAME_OVER]: '/audio/background.aac',
  [SoundFX.BACKGROUND]: '/audio/background.aac',
  [SoundFX.CORRECT_ANSWER]: '/audio/correct.aac',
  [SoundFX.INCORRECT_ANSWER]: '/audio/incorrect.aac',
  [SoundFX.OPEN_INFO]: '/audio/reveal.aac',
  [SoundFX.CHANGE_COLOUR]: '/audio/transform.aac',
}

type Buffers = Partial<Record<SoundFX, AudioBuffer>>

export type PlaySoundFX = (fx: SoundFX, loop?: boolean) => void

type SoundState = {
  isLoading: boolean
  isMuted: boolean
  setIsMuted: (isMuted: boolean) => void
  initialise: () => Promise<void>
  playSoundFX: PlaySoundFX
  stopSoundFX: (fx: SoundFX) => void
  stopAllSounds: () => void
}

type SoundStore = StoreApi<SoundState>
const SoundContext = createContext<SoundStore>(undefined!)

const createSoundStore = () => {
  let audioContext: AudioContext | null = null
  let master: GainNode | null = null
  let buffers: Buffers = {}
  let ready: Promise<void> | null = null
  const activeSources: Set<AudioBufferSourceNode> = new Set()

  async function ensureContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)()
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

    const loadSound = async (fx: SoundFX, url: string) => {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        entries.push([fx as SoundFX, audioBuffer])
      } catch (event) {
        console.error('[SoundProvider] Failed to load', fx, url, event)
      }
    }

    await Promise.all(
      Object.entries(SOUND_FILES).map(([fx, url]) => loadSound(fx as SoundFX, url)),
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
      const { playSoundFX, stopAllSounds } = get()
      set({ isMuted })
      if (!isMuted) {
        // Play background music when unmuting
        playSoundFX(SoundFX.BACKGROUND, true)
      } else {
        stopAllSounds()
      }
    },

    stopAllSounds: () => {
      activeSources.forEach((src) => {
        try {
          src.stop()
          src.disconnect()
        } catch (error) {
          console.error('[SoundProvider] Failed to stop sound source', src, error)
        }
      })
      activeSources.clear()
    },

    playSoundFX: async (fx: SoundFX, loop: boolean = false) => {
      const { isMuted } = get()

      const run = async () => {
        await ensureContext() // ensure resumed after a gesture (or later)
        if (!buffers[fx]) {
          // try to lazy-load if not loaded yet
          await get().initialise()
        }
        const audioBuffer = buffers[fx]
        if (!audioBuffer) {
          console.error(`[SoundProvider] Missing buffer for ${fx} after init`)
          return
        }
        const src = audioContext!.createBufferSource()
        src.buffer = audioBuffer
        src.loop = loop
        src.connect(master!)
        activeSources.add(src)
        src.onended = () => {
          activeSources.delete(src)
          try {
            src.disconnect()
          } catch {}
        }
        src.start(0)
      }

      if (isMuted) return

      try {
        await run()
      } catch (err) {
        console.warn(`[SoundProvider] Failed to play ${fx}`, err)
      }
    },

    stopSoundFX: (fx: SoundFX) => {
      activeSources.forEach((src) => {
        if (!src.buffer) return
        if (buffers[fx] !== src.buffer) return
        try {
          src.stop()
          src.disconnect()
          activeSources.delete(src)
        } catch (error) {
          console.error('[SoundProvider] Failed to stop sound source', src, error)
        }
      })
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
