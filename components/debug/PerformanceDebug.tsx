'use client'

import { type ChangeEvent, type FC, type ReactNode } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore } from '@/components/GameProvider'
import {
  type RapierSimFPS,
  SceneQuality,
  usePerformanceStore,
} from '@/components/PerformanceProvider'

type Option<T> = {
  label: string
  value: T
}

const SIM_FPS_OPTIONS: Option<RapierSimFPS>[] = [
  { label: 'Adaptive', value: 0 },
  { label: '30 fps', value: 30 },
  { label: '60 fps', value: 60 },
  { label: '120 fps', value: 120 },
]

const DPR_OPTIONS: Option<number | undefined>[] = [
  { label: 'Native', value: undefined },
  { label: '0.5', value: 0.5 },
  { label: '0.75', value: 0.75 },
  { label: '1.0', value: 1 },
  { label: '1.5', value: 1.5 },
  { label: '2.0', value: 2 },
]

const PerformanceDebug: FC = () => {
  const simFps = usePerformanceStore((s) => s.simFps)
  const setSimFps = usePerformanceStore((s) => s.setSimFps)
  const sceneQuality = usePerformanceStore((s) => s.sceneQuality)
  const setSceneQuality = usePerformanceStore((s) => s.setSceneQuality)
  const maxDpr = usePerformanceStore((s) => s.maxDPR)
  const setMaxDpr = usePerformanceStore((s) => s.setMaxDpr)
  const resetGame = useGameStore((s) => s.resetGame)

  const handleSimFpsChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.target.blur()
    setSimFps(Number(event.target.value) as RapierSimFPS)
  }

  const handleQualityChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.target.blur()
    setSceneQuality(event.target.value as SceneQuality)
  }

  const handleDprChange = (event: ChangeEvent<HTMLSelectElement>) => {
    event.target.blur()
    const next = event.target.value === 'native' ? undefined : Number(event.target.value)
    setMaxDpr(next)
  }

  return (
    <div className="fixed top-10 left-1 z-1000 max-w-56 space-y-2 rounded-md bg-black p-2 font-mono text-xs text-white">
      {/* <SelectRow
        id="performance-debug-sim-fps"
        label="Sim FPS"
        value={simFps.toString()}
        onChange={handleSimFpsChange}>
        {SIM_FPS_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </SelectRow> */}
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
        label="Max DPR"
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
      <button
        onClick={resetGame}
        className={twJoin(
          'w-full rounded bg-red-700 px-2 py-1 text-xs font-semibold text-white',
        )}>
        Reset Game
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

export default PerformanceDebug
