import type { ChangeEvent, FC } from 'react'
import { useCallback, useMemo } from 'react'
import { Save } from 'lucide-react'
import { useShallow } from 'zustand/react/shallow'

import { rgbToHex } from '@/components/palette'

import { AXIS_LABELS, PARAMETER_CONFIG } from '../store/constants'
import type { PaletteParamKey } from '../store/types'
import { evaluateCosinePalette } from '../utils'
import { ColorPicker } from './ColorPicker'
import { GlslExport } from './GlslExport'
import { SliderControl } from './SliderControl'
import { useDesignerToolsStore } from '../DesignerToolsProvider'

type ParameterConfigEntry = [PaletteParamKey, (typeof PARAMETER_CONFIG)[PaletteParamKey]]

const formatFloat = (value: number) => value.toFixed(2)

export const ColorControls: FC = () => {
  const {
    name,
    hex,
    params,
    userColours,
    setName,
    setHex,
    seedFromHex,
    setPaletteParam,
    saveUserColour,
    loadUserColour,
  } = useDesignerToolsStore(
    useShallow((state) => ({
      name: state.name,
      hex: state.hex,
      params: state.params,
      userColours: state.userColours,
      setName: state.setName,
      setHex: state.setHex,
      seedFromHex: state.seedFromHex,
      setPaletteParam: state.setPaletteParam,
      saveUserColour: state.saveUserColour,
      loadUserColour: state.loadUserColour,
    })),
  )

  const handleNameChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setName(event.target.value),
    [setName],
  )

  const handleHexChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setHex(event.target.value),
    [setHex],
  )

  const handleParamChange = useCallback(
    (key: PaletteParamKey, axis: number, value: number) => setPaletteParam(key, axis, value),
    [setPaletteParam],
  )
  const swatches = useMemo(() => {
    const sampleCount = 10
    return Array.from({ length: sampleCount }, (_, index) => {
      const t = sampleCount <= 1 ? 0 : index / (sampleCount - 1)
      return {
        hex: rgbToHex(evaluateCosinePalette(t, params)),
        t,
      }
    })
  }, [params])

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <label className="flex-1 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
              Name
              <input
                type="text"
                value={name ?? ''}
                onChange={handleNameChange}
                className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 font-mono text-sm text-white transition outline-none focus:border-white/40"
                placeholder="My Gradient"
              />
            </label>
            <button
              onClick={saveUserColour}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
              title="Save Config">
              <Save size={18} />
            </button>
          </div>

          <ColorPicker
            label="Anchor Hex"
            color={hex}
            onChange={(newHex) =>
              handleHexChange({ target: { value: newHex } } as ChangeEvent<HTMLInputElement>)
            }
            placeholder="#ff7a18"
          />

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={seedFromHex}
              className="h-10 w-full rounded-full bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20">
              Generate from Hex
            </button>
            {userColours.length > 0 && (
              <select
                onChange={(event) => {
                  const id = event.currentTarget.value
                  if (!id) return
                  loadUserColour(id)
                  event.currentTarget.selectedIndex = 0
                }}
                className="h-8 rounded-lg bg-white/5 px-2 text-xs text-white outline-none hover:bg-white/10"
                defaultValue="">
                <option value="" disabled>
                  Load previous...
                </option>
                {userColours.map((colour) => (
                  <option key={colour.id} value={colour.id}>
                    {colour.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
        <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
          Samples
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          {swatches.map((swatch) => (
            <div key={swatch.t} className="flex flex-col items-center gap-1">
              <div
                className="size-10 rounded-md border border-white/10 shadow-inner"
                style={{ background: swatch.hex }}
              />
              <span className="font-mono text-xs text-neutral-400">{formatFloat(swatch.t)}</span>
              <span className="font-mono text-xs text-neutral-500">{swatch.hex}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {(Object.entries(PARAMETER_CONFIG) as ParameterConfigEntry[]).map(([key, config]) => (
          <div key={key} className="rounded-xl border border-white/5 bg-black/10 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{config.label}</p>
              <span className="font-mono text-xs text-neutral-400">
                {params[key].map((value) => formatFloat(value)).join(', ')}
              </span>
            </div>
            <div className="space-y-3">
              {AXIS_LABELS.map((axisLabel, axisIndex) => (
                <SliderControl
                  key={axisLabel}
                  label={axisLabel}
                  value={params[key][axisIndex]}
                  min={config.min}
                  max={config.max}
                  step={config.step}
                  onChange={(value) => handleParamChange(key, axisIndex, value)}
                />
              ))}
            </div>
          </div>
        ))}

        <GlslExport params={params} />
      </div>
    </div>
  )
}
