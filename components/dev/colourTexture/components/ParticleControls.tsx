import { useCallback, useMemo, useState } from 'react'
import { Copy, Plus, X } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { useDesignerToolsStore } from '@/components/dev/colourTexture/DesignerToolsProvider'
import { formatPaletteAsConstant } from '@/components/dev/colourTexture/particlePalette/generator'
import {
  PARTICLE_RANGE_KEYS,
  type ParticlePaletteRangeKey,
} from '@/components/dev/colourTexture/particlePalette/types'

const RANGE_LABELS: Record<ParticlePaletteRangeKey, string> = {
  bright: 'Bright',
  cool: 'Cool',
  neutral: 'Neutral',
}

const RangeDescription: Record<ParticlePaletteRangeKey, string> = {
  bright: 'High energy tones pulled upward from the source colour.',
  cool: 'Balanced cooler offsets for depth and contrast.',
  neutral: 'Grounding greys and desaturated tones.',
}

const formatHex = (value: string) => value.toUpperCase()

export const ParticleControls = () => {
  const {
    inputs,
    draft,
    config,
    result,
    error,
    setDraft,
    addInput,
    removeInput,
    setRangeEnabled,
    setRangeCount,
    setRangeVariance,
    regenerate,
    clearError,
  } = useDesignerToolsStore(
    useShallow((state) => ({
      inputs: state.particlePalette.inputs,
      draft: state.particlePalette.draft,
      config: state.particlePalette.config,
      result: state.particlePalette.result,
      error: state.particlePalette.error,
      setDraft: state.setParticlePaletteDraft,
      addInput: state.addParticlePaletteInput,
      removeInput: state.removeParticlePaletteInput,
      setRangeEnabled: state.setParticleRangeEnabled,
      setRangeCount: state.setParticleRangeCount,
      setRangeVariance: state.setParticleRangeVariance,
      regenerate: state.regenerateParticlePalette,
      clearError: state.clearParticlePaletteError,
    })),
  )

  const [copied, setCopied] = useState(false)

  const handleAddHex = useCallback(() => {
    addInput()
  }, [addInput])

  const paletteConstant = useMemo(
    () => formatPaletteAsConstant('PARTICLE_PALETTE', result.combined),
    [result.combined],
  )

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(paletteConstant).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }, [paletteConstant])

  const hasResults = result.combined.length > 0

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-6">
        <div className="flex items-end gap-3">
          <label className="flex-1 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
            Add Source Hex
            <input
              type="text"
              value={draft}
              onChange={(event) => {
                if (error) clearError()
                setDraft(event.target.value)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  handleAddHex()
                }
              }}
              placeholder="#00fcdf"
              className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 font-mono text-sm text-white transition outline-none focus:border-white/40"
            />
          </label>
          <button
            onClick={handleAddHex}
            className="flex size-12 items-center justify-center rounded-xl bg-white/10 text-white transition hover:bg-white/20"
            title="Add colour">
            <Plus size={18} />
          </button>
        </div>
        {error && (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {inputs.map((hex) => (
            <div
              key={hex}
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 pr-1 pl-2 text-xs text-white">
              <span className="size-4 rounded-full" style={{ backgroundColor: hex }} />
              <span className="font-mono">{formatHex(hex)}</span>
              <button
                onClick={() => removeInput(hex)}
                className="rounded-full p-1 text-white/60 transition hover:text-white"
                title="Remove colour">
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Palette Ranges</p>
            <p className="text-xs text-neutral-400">Toggle ranges and tune sample density.</p>
          </div>
          <button
            onClick={regenerate}
            className="rounded-full border border-white/20 px-3 py-1 text-xs font-semibold tracking-wide text-white/80 uppercase transition hover:border-white/60 hover:text-white">
            Regenerate
          </button>
        </div>
        <div className="grid gap-4 md:grid-cols-1">
          {PARTICLE_RANGE_KEYS.map((key) => (
            <div key={key} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{RANGE_LABELS[key]}</p>
                <label className="flex items-center gap-2 text-[0.65rem] tracking-widest text-neutral-400 uppercase">
                  <span>Enabled</span>
                  <input
                    type="checkbox"
                    checked={config[key].enabled}
                    onChange={(event) => setRangeEnabled(key, event.target.checked)}
                    className="size-4 rounded border-white/10 bg-neutral-800 accent-white"
                  />
                </label>
              </div>
              <p className="mt-2 text-xs text-neutral-400">{RangeDescription[key]}</p>
              <div className="mt-4 space-y-3 text-xs text-neutral-300">
                <label className="flex flex-col gap-1">
                  <span className="font-semibold tracking-widest text-neutral-400 uppercase">
                    Count
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={32}
                    step={1}
                    value={config[key].count}
                    onChange={(event) => setRangeCount(key, Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-neutral-950/60 px-2 py-1 font-mono text-sm text-white transition outline-none focus:border-white/40"
                  />
                </label>
                <label className="flex flex-col gap-1">
                  <span className="font-semibold tracking-widest text-neutral-400 uppercase">
                    Variance
                  </span>
                  <input
                    type="number"
                    min={0}
                    max={0.5}
                    step={0.01}
                    value={config[key].variance}
                    onChange={(event) => setRangeVariance(key, Number(event.target.value))}
                    className="rounded-lg border border-white/10 bg-neutral-950/60 px-2 py-1 font-mono text-sm text-white transition outline-none focus:border-white/40"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-6">
        <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Palette Output</p>
            <p className="text-xs text-neutral-400">
              Combined list includes your sources plus generated shades.
            </p>
          </div>
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/20">
            <Copy size={12} />
            {copied ? 'Copied!' : 'Copy JS Constant'}
          </button>
        </div>
        <pre className="overflow-x-auto rounded-xl bg-black/40 p-4 text-[0.7rem] text-neutral-200">
          {paletteConstant}
        </pre>
        {!hasResults && (
          <p className="mt-3 text-xs text-neutral-400">
            Add at least one valid hex colour to generate a palette.
          </p>
        )}
      </div>
    </div>
  )
}
