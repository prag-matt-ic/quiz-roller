import { useMemo } from 'react'
import { useShallow } from 'zustand/react/shallow'

import { useDesignerToolsStore } from '@/components/dev/colourTexture/DesignerToolsProvider'
import { PARTICLE_RANGE_KEYS } from '@/components/dev/colourTexture/particlePalette/types'

const RANGE_LABELS = {
  bright: 'Bright Accents',
  cool: 'Cool Variants',
  neutral: 'Neutral Anchors',
} as const

const formatHex = (value: string) => value.toUpperCase()

export const ParticlePalettePreview = () => {
  const { groups, sources, combined } = useDesignerToolsStore(
    useShallow((state) => ({
      groups: state.particlePalette.result.groups,
      sources: state.particlePalette.result.sources,
      combined: state.particlePalette.result.combined,
    })),
  )

  const totalSwatches = combined.length

  const paletteRows = useMemo(
    () =>
      PARTICLE_RANGE_KEYS.map((key) => {
        const colours = groups[key]
        return (
          <div
            key={key}
            className="rounded-2xl border border-white/10 bg-black/40 p-5 shadow-[0_10px_40px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">{RANGE_LABELS[key]}</p>
                <p className="text-xs text-neutral-400">Procedurally offset from the source.</p>
              </div>
              <span className="text-xs uppercase tracking-wide text-neutral-400">
                {colours.length} colours
              </span>
            </div>
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-3">
              {colours.length === 0 ? (
                <p className="col-span-full text-xs text-neutral-500">
                  Enable this range to see generated colours.
                </p>
              ) : (
                colours.map((hex, index) => (
                  <div
                    key={`${key}-${hex}-${index}`}
                    className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-2">
                    <div
                      className="size-12 rounded-xl shadow-inner"
                      style={{ backgroundColor: hex }}
                    />
                    <span className="font-mono text-[0.65rem] text-neutral-200">
                      {formatHex(hex)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )
      }),
    [groups],
  )

  return (
    <div className="flex size-full flex-col overflow-hidden bg-[#010101]">
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
        <div>
          <p className="text-sm font-semibold text-white">Particle Palette Preview</p>
          <p className="text-xs text-neutral-400">
            {totalSwatches} total colours including your source swatches.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {sources.map((hex) => (
            <div
              key={hex}
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white">
              <span className="size-3 rounded-full" style={{ backgroundColor: hex }} />
              <span className="font-mono">{formatHex(hex)}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="flex flex-col gap-6">{paletteRows}</div>
      </div>
    </div>
  )
}
