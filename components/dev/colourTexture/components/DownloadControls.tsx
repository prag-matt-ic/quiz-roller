import { type ChangeEvent, type FC, useCallback } from 'react'

import {
  CUSTOM_PRESET_ID,
  MAX_EXPORT_RESOLUTION,
  MIN_ASPECT_COMPONENT,
  MIN_EXPORT_RESOLUTION,
  PRESET_RESOLUTIONS,
} from '../store/constants'

export type DownloadControlsProps = {
  resolutionId: string
  onResolutionChange: (id: string) => void
  customResolution: string
  onCustomResolutionChange: (value: string) => void
  aspectWidth: string
  aspectHeight: string
  onAspectWidthChange: (value: string) => void
  onAspectHeightChange: (value: string) => void
  computedWidth: number
  computedHeight: number
  onDownload: () => void
}

export const DownloadControls: FC<DownloadControlsProps> = ({
  resolutionId,
  onResolutionChange,
  customResolution,
  onCustomResolutionChange,
  aspectWidth,
  aspectHeight,
  onAspectWidthChange,
  onAspectHeightChange,
  computedWidth,
  computedHeight,
  onDownload,
}) => {
  const handlePresetChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      onResolutionChange(event.target.value)
    },
    [onResolutionChange],
  )

  const handleCustomResolutionChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onCustomResolutionChange(event.target.value)
    },
    [onCustomResolutionChange],
  )

  const handleAspectWidthChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onAspectWidthChange(event.target.value)
    },
    [onAspectWidthChange],
  )

  const handleAspectHeightChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onAspectHeightChange(event.target.value)
    },
    [onAspectHeightChange],
  )

  return (
    <div className="absolute right-6 bottom-6 flex flex-wrap items-center gap-3 rounded-xl border border-white/10 bg-neutral-900/80 p-3 backdrop-blur-md">
      <div className="flex items-center gap-2">
        <select
          value={resolutionId}
          onChange={handlePresetChange}
          className="h-9 rounded-lg bg-white/5 px-3 text-xs font-medium text-white transition outline-none hover:bg-white/10 focus:bg-white/10">
          {PRESET_RESOLUTIONS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.label}
            </option>
          ))}
          <option value={CUSTOM_PRESET_ID}>Custom</option>
        </select>
        {resolutionId === CUSTOM_PRESET_ID && (
          <input
            type="number"
            min={MIN_EXPORT_RESOLUTION}
            max={MAX_EXPORT_RESOLUTION}
            value={customResolution}
            onChange={handleCustomResolutionChange}
            className="h-9 w-24 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-semibold text-white transition outline-none hover:border-white/30 focus:border-white"
          />
        )}
      </div>
      <label className="flex flex-col text-[0.6rem] tracking-widest text-neutral-400">
        Width Ratio
        <input
          type="number"
          min={MIN_ASPECT_COMPONENT}
          step={0.01}
          value={aspectWidth}
          onChange={handleAspectWidthChange}
          className="mt-1 h-9 w-20 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-semibold text-white transition outline-none hover:border-white/30 focus:border-white"
        />
      </label>
      <label className="flex flex-col text-[0.6rem] tracking-widest text-neutral-400">
        Height Ratio
        <input
          type="number"
          min={MIN_ASPECT_COMPONENT}
          step={0.01}
          value={aspectHeight}
          onChange={handleAspectHeightChange}
          className="mt-1 h-9 w-20 rounded-lg border border-white/10 bg-white/5 px-2 text-xs font-semibold text-white transition outline-none hover:border-white/30 focus:border-white"
        />
      </label>
      <div className="flex flex-col text-[0.6rem] tracking-widest text-neutral-400 uppercase">
        Output
        <span className="mt-1 text-xs font-semibold text-white">{`${computedWidth} x ${computedHeight}`}</span>
      </div>
      <button
        onClick={onDownload}
        className="h-9 rounded-lg bg-white px-4 text-xs font-bold text-black transition hover:bg-neutral-200 active:scale-95">
        Download
      </button>
    </div>
  )
}
