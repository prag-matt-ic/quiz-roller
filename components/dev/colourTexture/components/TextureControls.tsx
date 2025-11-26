import { type FC, useState } from 'react'
import { Save } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { SliderControl } from './SliderControl'
import type { TextureConfigState } from '../store/types'
import { useDesignerToolsStore } from '../DesignerToolsProvider'

export const TextureControls: FC = () => {
  const { config, texturePresets, userColours, updateConfig, saveTexturePreset, loadTexturePreset } =
    useDesignerToolsStore(
      useShallow((state) => ({
        config: state.config,
        texturePresets: state.texturePresets,
        userColours: state.userColours,
        updateConfig: state.updateConfig,
        saveTexturePreset: state.saveTexturePreset,
        loadTexturePreset: state.loadTexturePreset,
      })),
    )

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
                  saveTexturePreset(presetName)
                  setPresetName('')
                }
              }}
              disabled={!presetName}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20 disabled:opacity-50"
              title="Save Preset">
              <Save size={18} />
            </button>
          </div>

          {(texturePresets.length > 0 || userColours.length > 0) && (
            <label className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
              Load Preset
              <select
                onChange={(event) => {
                  const id = event.currentTarget.value
                  if (!id) return
                  loadTexturePreset(id)
                  event.currentTarget.selectedIndex = 0
                }}
                className="mt-2 h-10 w-full rounded-lg bg-white/5 px-3 text-sm text-white outline-none hover:bg-white/10"
                defaultValue="">
                <option value="" disabled>
                  Select a preset...
                </option>
                {texturePresets.length > 0 && (
                  <optgroup label="Saved Presets">
                    {texturePresets.map((preset) => (
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
            onChange={(value) => updateConfig('blackMix', value)}
          />
          <label className="flex items-center gap-3 text-xs tracking-wide text-neutral-400 uppercase">
            <span className="w-24 text-neutral-500">Overlay</span>
            <input
              type="checkbox"
              checked={config.showGradientOverlay}
              onChange={(event) => updateConfig('showGradientOverlay', event.target.checked)}
              className="size-4 rounded border-white/10 bg-neutral-800 accent-white"
            />
          </label>
          <SliderControl
            label="Gradient Range"
            value={config.gradientRange}
            min={0.25}
            max={3}
            step={0.05}
            onChange={(value) => updateConfig('gradientRange', value)}
          />
          <SliderControl
            label="Origin X"
            value={config.originX}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => updateConfig('originX', value)}
          />
          <SliderControl
            label="Origin Y"
            value={config.originY}
            min={-1}
            max={1}
            step={0.01}
            onChange={(value) => updateConfig('originY', value)}
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
            onChange={(value) => updateConfig('grainScale', value)}
          />
          <SliderControl
            label="Amplitude"
            value={config.grainAmplitude}
            min={0}
            max={5}
            step={0.1}
            onChange={(value) => updateConfig('grainAmplitude', value)}
          />
          <SliderControl
            label="Mix"
            value={config.grainMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => updateConfig('grainMix', value)}
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
            onChange={(value) => updateConfig('fbmScale', value)}
          />
          <SliderControl
            label="Octaves"
            value={config.fbmOctaves}
            min={1}
            max={12}
            step={1}
            onChange={(value) => updateConfig('fbmOctaves', value)}
          />
          <SliderControl
            label="Lacunarity"
            value={config.fbmLacunarity}
            min={1}
            max={4}
            step={0.1}
            onChange={(value) => updateConfig('fbmLacunarity', value)}
          />
          <SliderControl
            label="Gain"
            value={config.fbmGain}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(value) => updateConfig('fbmGain', value)}
          />
          <SliderControl
            label="Mix"
            value={config.fbmMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => updateConfig('fbmMix', value)}
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
            onChange={(value) => updateConfig('vignetteStrength', value)}
          />
          <SliderControl
            label="Radius"
            value={config.vignetteRadius}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => updateConfig('vignetteRadius', value)}
          />
          <SliderControl
            label="Smoothness"
            value={config.vignetteSmoothness}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => updateConfig('vignetteSmoothness', value)}
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
            onChange={(value) => updateConfig('worleyScale', value)}
          />
          <SliderControl
            label="Jitter"
            value={config.worleyJitter}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => updateConfig('worleyJitter', value)}
          />
          <SliderControl
            label="Mix"
            value={config.worleyMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(value) => updateConfig('worleyMix', value)}
          />
          <label className="flex items-center gap-3 text-xs tracking-wide text-neutral-400 uppercase">
            <span className="w-24 text-neutral-500">Pattern</span>
            <select
              value={config.worleyPattern}
              onChange={(event) => updateConfig('worleyPattern', Number(event.target.value))}
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
