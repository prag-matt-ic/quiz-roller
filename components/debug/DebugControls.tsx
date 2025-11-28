'use client'

import { type ChangeEvent, type FC, type ReactNode } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import { SceneQuality, usePerformanceStore } from '@/components/PerformanceProvider'
import { GameMode } from '@/stores/types'

type Option<T> = {
  label: string
  value: T
}

// const SIM_FPS_OPTIONS: Option<RapierSimFPS>[] = [
//   { label: 'Adaptive', value: 0 },
//   { label: '30 fps', value: 30 },
//   { label: '60 fps', value: 60 },
//   { label: '120 fps', value: 120 },
// ]

const DPR_OPTIONS: Option<number | undefined>[] = [
  { label: 'Native', value: undefined },
  { label: '0.5', value: 0.5 },
  { label: '0.75', value: 0.75 },
  { label: '1.0', value: 1 },
  { label: '1.5', value: 1.5 },
  { label: '2.0', value: 2 },
] as const

const GAME_MODE_OPTIONS: Option<GameMode>[] = [
  { label: 'Main Run', value: GameMode.MAIN },
  { label: 'Speedrun', value: GameMode.SPEEDRUN },
  { label: 'Test', value: GameMode.TEST },
]

const DebugControls: FC = () => {
  // const simFps = usePerformanceStore((s) => s.simFps)
  // const setSimFps = usePerformanceStore((s) => s.setSimFps)
  const sceneQuality = usePerformanceStore((s) => s.sceneQuality)
  const setSceneQuality = usePerformanceStore((s) => s.setSceneQuality)
  const maxDpr = usePerformanceStore((s) => s.maxDPR)
  const setMaxDpr = usePerformanceStore((s) => s.setMaxDpr)
  const mode = useGameStore((s) => s.mode)
  const isPhysicsDebug = usePerformanceStore((s) => s.isPhysicsDebug)
  const setIsPhysicsDebug = usePerformanceStore((s) => s.setIsPhysicsDebug)
  const resetGame = useGameStore((s) => s.resetGame)

  const handleQualityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.target.blur()
    setSceneQuality(event.target.value as SceneQuality)
  }

  const handleDprChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.target.blur()
    const next = event.target.value === 'native' ? undefined : Number(event.target.value)
    setMaxDpr(next)
  }

  const handlePlatformChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.target.blur()
    resetGame({ mode: event.target.value as GameMode })
  }

  const handlePhysicsDebugChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.target.blur()
    setIsPhysicsDebug(event.target.value === 'true')
  }

  return (
    <div className="fixed top-0 left-0 z-5001 max-w-56 space-y-2 bg-black p-2 pt-14 text-xs text-white">
      <SelectRow
        id="performance-debug-scene-quality"
        label="Quality"
        value={sceneQuality}
        onChange={handleQualityChange}>
        {Object.values(SceneQuality).map((quality) => (
          <option key={quality} value={quality}>
            {quality}
          </option>
        ))}
      </SelectRow>
      <SelectRow
        id="performance-debug-dpr"
        label="DPR"
        value={maxDpr === undefined ? 'native' : maxDpr.toString()}
        onChange={handleDprChange}>
        {DPR_OPTIONS.map((option) => (
          <option
            key={option.label}
            value={option.value === undefined ? 'native' : option.value.toString()}>
            {option.label}
          </option>
        ))}
      </SelectRow>
      <SelectRow
        id="performance-debug-physics"
        label="Physics Debug"
        value={isPhysicsDebug ? 'true' : 'false'}
        onChange={handlePhysicsDebugChange}>
        <option value="false">Off</option>
        <option value="true">On</option>
      </SelectRow>
      <SelectRow
        id="performance-debug-mode"
        label="Mode"
        value={mode}
        onChange={handlePlatformChange}>
        {GAME_MODE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectRow>

      <button
        onClick={() => resetGame({ mode })}
        className="w-full rounded bg-red-900 p-1 text-xs font-semibold text-white">
        Reset
      </button>
    </div>
  )
}

type SelectRowProps = {
  id: string
  label: string
  value: string
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void
  children: ReactNode
}

const SelectRow: FC<SelectRowProps> = ({ id, label, value, onChange, children }) => {
  return (
    <label className="flex items-center justify-between gap-3">
      <span className="font-semibold text-white/70">{label}</span>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className={twJoin(
          'min-w-32 rounded border border-white/10 bg-white/10 px-2 py-1 text-right text-xs text-white transition outline-none',
          'focus:border-white/40 focus:bg-white/20 focus:shadow-inner',
        )}>
        {children}
      </select>
    </label>
  )
}

export default DebugControls
