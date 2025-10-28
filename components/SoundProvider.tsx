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
  let masterGain: GainNode | null = null
  let audioBuffers: Buffers = {}
  let initialisationPromise: Promise<void> | null = null
  const activeSources = new Set<AudioBufferSourceNode>()
  const gainNodesBySource = new Map<AudioBufferSourceNode, GainNode>()
  const DEFAULT_MASTER_GAIN = 0.5
  const DEFAULT_SOURCE_GAIN = 1
  const STOP_FX_FADE_SECONDS = 0.3

  const safelyDisconnect = (node: AudioNode | null | undefined) => {
    if (!node) return
    try {
      node.disconnect()
    } catch {}
  }

  const cleanupSource = (source: AudioBufferSourceNode) => {
    const gainNode = gainNodesBySource.get(source)
    gainNodesBySource.delete(source)
    activeSources.delete(source)
    source.onended = null
    safelyDisconnect(source)
    safelyDisconnect(gainNode)
  }

  const registerSource = (source: AudioBufferSourceNode, gainNode: GainNode) => {
    activeSources.add(source)
    gainNodesBySource.set(source, gainNode)
    source.onended = () => {
      cleanupSource(source)
    }
  }

  const fadeOutSource = (source: AudioBufferSourceNode, duration: number) => {
    if (!audioContext) return
    const now = audioContext.currentTime
    const gainNode = gainNodesBySource.get(source)
    if (gainNode) {
      gainNode.gain.cancelScheduledValues(now)
      const currentValue = gainNode.gain.value
      gainNode.gain.setValueAtTime(currentValue, now)
      gainNode.gain.linearRampToValueAtTime(0, now + duration)
    }
    try {
      source.stop(now + duration)
    } catch (error) {
      console.error('[SoundProvider] Failed to stop sound source', source, error)
    }
  }

  const stopSourceImmediately = (source: AudioBufferSourceNode) => {
    try {
      source.stop()
    } catch (error) {
      console.error('[SoundProvider] Failed to stop sound source', source, error)
    } finally {
      cleanupSource(source)
    }
  }

  async function ensureContext() {
    if (!audioContext) {
      audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext)()
      masterGain = audioContext.createGain()
      masterGain.connect(audioContext.destination)
      masterGain.gain.value = DEFAULT_MASTER_GAIN
    }
    if (audioContext.state === 'suspended') {
      await audioContext.resume()
    }
    return { audioContext, masterGain }
  }

  async function loadAllSounds(): Promise<void> {
    const { audioContext } = await ensureContext()
    const loadedBuffers: [SoundFX, AudioBuffer][] = []

    const loadSound = async (fx: SoundFX, url: string) => {
      try {
        const response = await fetch(url)
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
        const arrayBuffer = await response.arrayBuffer()
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        loadedBuffers.push([fx as SoundFX, audioBuffer])
      } catch (event) {
        console.error('[SoundProvider] Failed to load', fx, url, event)
      }
    }

    await Promise.all(
      Object.entries(SOUND_FILES).map(([fx, url]) => loadSound(fx as SoundFX, url)),
    )

    audioBuffers = Object.fromEntries(loadedBuffers)
  }

  return createStore<SoundState>()((set, get) => ({
    isLoading: true,
    isMuted: true,

    initialise: async () => {
      if (!initialisationPromise) {
        initialisationPromise = loadAllSounds().finally(() => set({ isLoading: false }))
      }
      await initialisationPromise
    },

    setIsMuted: (isMuted: boolean) => {
      const { playSoundFX, stopAllSounds } = get()
      set({ isMuted })
      if (!isMuted) {
        playSoundFX(SoundFX.BACKGROUND, true)
      } else {
        stopAllSounds()
      }
    },

    stopAllSounds: () => {
      const sources = Array.from(activeSources)
      sources.forEach((source) => {
        const gainNode = gainNodesBySource.get(source)
        if (gainNode && audioContext) {
          const now = audioContext.currentTime
          gainNode.gain.cancelScheduledValues(now)
        }
        stopSourceImmediately(source)
      })
      gainNodesBySource.clear()
      activeSources.clear()
    },

    playSoundFX: async (fx: SoundFX, loop: boolean = false) => {
      const { isMuted } = get()

      const startPlayback = async () => {
        await ensureContext()
        if (!audioBuffers[fx]) {
          await get().initialise()
        }
        const audioBuffer = audioBuffers[fx]
        if (!audioBuffer) {
          console.error(`[SoundProvider] Missing buffer for ${fx} after init`)
          return
        }
        const bufferSource = audioContext!.createBufferSource()
        bufferSource.buffer = audioBuffer
        bufferSource.loop = loop
        const gainNode = audioContext!.createGain()
        gainNode.gain.value = DEFAULT_SOURCE_GAIN
        bufferSource.connect(gainNode)
        gainNode.connect(masterGain!)
        registerSource(bufferSource, gainNode)
        bufferSource.start(0)
      }

      if (isMuted) return

      try {
        await startPlayback()
      } catch (err) {
        console.warn(`[SoundProvider] Failed to play ${fx}`, err)
      }
    },

    stopSoundFX: (fx: SoundFX) => {
      if (!audioContext) return
      activeSources.forEach((source) => {
        if (!source.buffer) return
        if (audioBuffers[fx] !== source.buffer) return
        fadeOutSource(source, STOP_FX_FADE_SECONDS)
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
