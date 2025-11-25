import { type FC, useState } from 'react'
import { Save } from 'lucide-react'

import { SliderControl } from './SliderControl'
import type { TextureConfigState, TexturePreset, UserColour } from '../store/types'

export type TextureControlsProps = {
  config: TextureConfigState
  presets: TexturePreset[]
  userColours: UserColour[]
  update: <K extends keyof TextureConfigState>(key: K, value: TextureConfigState[K]) => void
  onSave: (name: string) => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}

export const TextureControls: FC<TextureControlsProps> = ({
  config,
  presets,
  userColours,
  update,
  onSave,
  onLoad,
}) => {
  const [presetName, setPresetName] = useState('')

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/5 bg-neutral-900/60 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <label className="flex-1 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
              Save Preset
              <input
                type="text"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 font-mono text-sm text-white transition outline-none focus:border-white/40"
                placeholder="My Texture"
              />
            </label>
            <button
              onClick={() => {
                if (presetName) {
                  onSave(presetName)
                  setPresetName('')
                }
              }}
              disabled={!presetName}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
              title="Save Preset">
              <Save size={18} />
            </button>
          </div>

          {(presets.length > 0 || userColours.length > 0) && (
            <label className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
              Load Preset
              <select
                onChange={(event) => {
                  if (event.target.value) onLoad(event.target.value)
                }}
                className="mt-2 h-10 w-full rounded-lg bg-white/5 px-3 text-sm text-white outline-none hover:bg-white/10"
                value="">
                <option value="" disabled>
                  Select a preset...
                </option>
                {presets.length > 0 && (
                  <optgroup label="Saved Presets">
                    {presets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {userColours.length > 0 && (
                  <optgroup label="From Color Palettes">
                    {userColours.map((colour) => (
                      <option key={colour.id} value={colour.id}>
                        {colour.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/10 p-4">
        <p className="mb-4 text-sm font-semibold text-white">Global</p>
        <div className="space-y-3">
          <SliderControl
            label="Black Mix"
            value={config.blackMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => update('blackMix', value)}
          />
          <label className="flex items-center gap-3 text-xs tracking-wide text-neutral-400 uppercase">
            <span className="w-24 text-neutral-500">Overlay</span>
            <input
              type="checkbox"
              checked={config.showGradientOverlay}
              onChange={(event) => update('showGradientOverlay', event.target.checked)}
              className="size-4 rounded border-white/10 bg-neutral-800 accent-white"
            />
          </label>
          <SliderControl
            label="Gradient Range"
            value={config.gradientRange}
            min={0.25}
            max={3}
            step={0.05}
            onChange={(value) => update('gradientRange', value)}
          />
          <SliderControl
            label="Origin X"
            value={config.originX}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => update('originX', value)}
          />
          <SliderControl
            label="Origin Y"
            value={config.originY}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => update('originY', value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/10 p-4">
        <p className="mb-4 text-sm font-semibold text-white">Grainy Noise</p>
        <div className="space-y-3">
          <SliderControl
            label="Scale"
            value={config.grainScale}
            min={32}
            max={1024}
            step={32}
            onChange={(value) => update('grainScale', value)}
          />
          <SliderControl
            label="Amplitude"
            value={config.grainAmplitude}
            min={0}
            max={5}
            step={0.1}
            onChange={(value) => update('grainAmplitude', value)}
          />
          <SliderControl
            label="Mix"
            value={config.grainMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => update('grainMix', value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/10 p-4">
        <p className="mb-4 text-sm font-semibold text-white">Fractal Noise</p>
        <div className="space-y-3">
          <SliderControl
            label="Scale"
            value={config.fbmScale}
            min={0.5}
            max={32}
            step={0.5}
            onChange={(value) => update('fbmScale', value)}
          />
          <SliderControl
            label="Octaves"
            value={config.fbmOctaves}
            min={1}
            max={12}
            step={1}
            onChange={(value) => update('fbmOctaves', value)}
          />
          <SliderControl
            label="Lacunarity"
            value={config.fbmLacunarity}
            min={1}
            max={4}
            step={0.1}
            onChange={(value) => update('fbmLacunarity', value)}
          />
          <SliderControl
            label="Gain"
            value={config.fbmGain}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(value) => update('fbmGain', value)}
          />
          <SliderControl
            label="Mix"
            value={config.fbmMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => update('fbmMix', value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/10 p-4">
        <p className="mb-4 text-sm font-semibold text-white">Vignette</p>
        <div className="space-y-3">
          <SliderControl
            label="Strength"
            value={config.vignetteStrength}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => update('vignetteStrength', value)}
          />
          <SliderControl
            label="Radius"
            value={config.vignetteRadius}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => update('vignetteRadius', value)}
          />
          <SliderControl
            label="Smoothness"
            value={config.vignetteSmoothness}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => update('vignetteSmoothness', value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-white/5 bg-black/10 p-4">
        <p className="mb-4 text-sm font-semibold text-white">Worley Noise</p>
        <div className="space-y-3">
          <SliderControl
            label="Scale"
            value={config.worleyScale}
            min={0.5}
            max={64}
            step={0.5}
            onChange={(value) => update('worleyScale', value)}
          />
          <SliderControl
            label="Jitter"
            value={config.worleyJitter}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => update('worleyJitter', value)}
          />
          <SliderControl
            label="Mix"
            value={config.worleyMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => update('worleyMix', value)}
          />
          <label className="flex items-center gap-3 text-xs tracking-wide text-neutral-400 uppercase">
            <span className="w-24 text-neutral-500">Pattern</span>
            <select
              value={config.worleyPattern}
              onChange={(event) => update('worleyPattern', Number(event.target.value))}
              className="flex-1 rounded bg-neutral-800 px-2 py-1 text-white">
              <option value={0}>F1</option>
              <option value={1}>F2</option>
              <option value={2}>F2-F1</option>
            </select>
          </label>
        </div>
      </div>
    </div>
  )
}
