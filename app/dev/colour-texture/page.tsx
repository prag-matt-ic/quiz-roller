'use client'

import { ScreenQuad } from '@react-three/drei'

import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import {
  type ChangeEvent,
  type FC,
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Copy, Save } from 'lucide-react'
import { OrthographicCamera, ShaderMaterial, Vector2, type Vector3Tuple } from 'three'
import { useShallow } from 'zustand/react/shallow'

import { rgbToHex } from '@/components/palette'
import {
  ColourTextureShader,
  type ColourTextureShaderUniforms,
  INITIAL_COLOUR_TEXTURE_UNIFORMS,
} from '@/components/dev/colourTexture/shaders/ColourTextureShader'
import {
  ColourTextureProvider,
  useColourTextureStore,
} from '@/components/dev/colourTexture/ColourTextureProvider'
import {
  AXIS_LABELS,
  CUSTOM_PRESET_ID,
  DEFAULT_EXPORT_RESOLUTION,
  MAX_EXPORT_RESOLUTION,
  MIN_ASPECT_COMPONENT,
  MIN_EXPORT_RESOLUTION,
  PARAMETER_CONFIG,
  PRESET_RESOLUTIONS,
  TAU,
} from '@/components/dev/colourTexture/store/constants'
import type {
  CosinePaletteParams,
  PaletteParamKey,
  TextureConfigState,
  TexturePreset,
  UserColour,
} from '@/components/dev/colourTexture/store/types'

// -----------------------------------------------------------------------------
// Types & Constants
// -----------------------------------------------------------------------------

const ColourTextureShaderMaterial = extend(ColourTextureShader)

const PREVIEW_SIZE = 512

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const clampUnit = (value: number) => clamp(value, 0, 1)
const clampResolution = (value: number) =>
  clamp(Math.round(value), MIN_EXPORT_RESOLUTION, MAX_EXPORT_RESOLUTION)
const parseResolutionInput = (value: string) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return DEFAULT_EXPORT_RESOLUTION
  return clampResolution(numericValue)
}
const parseAspectInput = (value: string) => {
  const numericValue = Number(value)
  if (!Number.isFinite(numericValue)) return 1
  return clamp(Math.abs(numericValue), MIN_ASPECT_COMPONENT, Number.MAX_SAFE_INTEGER)
}
const getNormalizedAspectMultipliers = (width: number, height: number) => {
  const safeWidth = width <= 0 ? 1 : width
  const safeHeight = height <= 0 ? 1 : height
  const minComponent = Math.min(safeWidth, safeHeight)
  const divisor = minComponent || 1
  return {
    widthMultiplier: safeWidth / divisor,
    heightMultiplier: safeHeight / divisor,
  }
}

const evaluateCosinePalette = (t: number, params: CosinePaletteParams): Vector3Tuple => {
  const safeT = clampUnit(Number.isFinite(t) ? t : 0)
  return [
    clampUnit(params.a[0] + params.b[0] * Math.cos(TAU * (params.c[0] * safeT + params.d[0]))),
    clampUnit(params.a[1] + params.b[1] * Math.cos(TAU * (params.c[1] * safeT + params.d[1]))),
    clampUnit(params.a[2] + params.b[2] * Math.cos(TAU * (params.c[2] * safeT + params.d[2]))),
  ]
}

// -----------------------------------------------------------------------------
// Components
// -----------------------------------------------------------------------------

export type ColourTextureCanvasHandle = {
  capture: (width: number, height: number) => void
}

const ColourTextureCanvas = forwardRef<
  ColourTextureCanvasHandle,
  {
    colourParams: CosinePaletteParams
    textureConfig: TextureConfigState
  }
>(({ colourParams, textureConfig }, ref) => {
  const shaderRef = useRef<(ShaderMaterial & ColourTextureShaderUniforms) | null>(null)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const accumTime = useRef(0)

  // Pre-allocated vectors
  const resolutionUniform = useMemo(() => new Vector2(PREVIEW_SIZE, PREVIEW_SIZE), [])

  useImperativeHandle(ref, () => ({
    capture: (targetWidth: number, targetHeight: number) => {
      if (!gl || !shaderRef.current) return

      try {
        const safeWidth = clampResolution(targetWidth)
        const safeHeight = clampResolution(targetHeight)

        // Store original state
        const originalWidth = gl.domElement.width
        const originalHeight = gl.domElement.height
        const originalPixelRatio = gl.getPixelRatio()

        // Set high-res rendering
        gl.setPixelRatio(1)
        gl.setSize(safeWidth, safeHeight, false)

        // Update shader resolution
        shaderRef.current.uResolution.set(safeWidth, safeHeight)
        shaderRef.current.uSampleWeight = 1

        // Disable overlay for download
        const wasOverlayEnabled = shaderRef.current.uShowGradientOverlay
        shaderRef.current.uShowGradientOverlay = false

        // Update camera

        const originalLeft = camera.left
        const originalRight = camera.right
        const originalTop = camera.top
        const originalBottom = camera.bottom

        camera.left = -1
        camera.right = 1
        camera.top = 1
        camera.bottom = -1
        camera.updateProjectionMatrix()

        // Render
        gl.render(scene, camera)

        // Capture
        gl.domElement.toBlob(
          (blob) => {
            if (!blob) return
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
            link.download = `texture-${safeWidth}x${safeHeight}-${timestamp}.jpg`
            link.href = url
            link.click()
            URL.revokeObjectURL(url)
          },
          'image/jpeg',
          1.0,
        )

        // Restore state
        gl.setPixelRatio(originalPixelRatio)
        gl.setSize(
          originalWidth / originalPixelRatio,
          originalHeight / originalPixelRatio,
          false,
        )
        shaderRef.current.uResolution.copy(resolutionUniform)
        shaderRef.current.uShowGradientOverlay = wasOverlayEnabled

        camera.left = originalLeft

        camera.right = originalRight
        camera.top = originalTop
        camera.bottom = originalBottom
        camera.updateProjectionMatrix()
      } catch (error) {
        console.error('Capture failed:', error)
      }
    },
  }))

  useFrame((_, delta) => {
    if (!shaderRef.current) return
    accumTime.current += delta

    shaderRef.current.uTime = accumTime.current
    shaderRef.current.uResolution.copy(resolutionUniform)

    // Update Palette Uniforms
    shaderRef.current.uA.set(...colourParams.a)
    shaderRef.current.uB.set(...colourParams.b)
    shaderRef.current.uC.set(...colourParams.c)
    shaderRef.current.uD.set(...colourParams.d)

    // Update Texture Uniforms
    shaderRef.current.uGrainScale = textureConfig.grainScale
    shaderRef.current.uGrainAmplitude = textureConfig.grainAmplitude
    shaderRef.current.uGrainMix = textureConfig.grainMix

    shaderRef.current.uFbmScale = textureConfig.fbmScale
    shaderRef.current.uFbmOctaves = textureConfig.fbmOctaves
    shaderRef.current.uFbmLacunarity = textureConfig.fbmLacunarity
    shaderRef.current.uFbmGain = textureConfig.fbmGain
    shaderRef.current.uFbmMix = textureConfig.fbmMix

    shaderRef.current.uVignetteStrength = textureConfig.vignetteStrength
    shaderRef.current.uVignetteRadius = textureConfig.vignetteRadius
    shaderRef.current.uVignetteSmoothness = textureConfig.vignetteSmoothness

    shaderRef.current.uWorleyScale = textureConfig.worleyScale
    shaderRef.current.uWorleyJitter = textureConfig.worleyJitter
    shaderRef.current.uWorleyManhattan = textureConfig.worleyManhattan ? 1 : 0
    shaderRef.current.uWorleyPattern = textureConfig.worleyPattern
    shaderRef.current.uWorleyMix = textureConfig.worleyMix

    shaderRef.current.uBlackMix = textureConfig.blackMix
    shaderRef.current.uShowGradientOverlay = textureConfig.showGradientOverlay
    shaderRef.current.uGradientRange = textureConfig.gradientRange
    shaderRef.current.uOriginOffset.set(textureConfig.originX, textureConfig.originY)
  })

  useEffect(() => {
    resolutionUniform.set(size.width, size.height)
  }, [resolutionUniform, size])

  return (
    <ScreenQuad>
      <ColourTextureShaderMaterial
        ref={shaderRef}
        key={ColourTextureShader.key}
        {...INITIAL_COLOUR_TEXTURE_UNIFORMS}
        uResolution={resolutionUniform}
      />
    </ScreenQuad>
  )
})
ColourTextureCanvas.displayName = 'ColourTextureCanvas'

const SliderControl: FC<{
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (val: number) => void
}> = ({ label, value, min, max, step, onChange }) => (
  <label className="flex items-center gap-3 text-xs tracking-wide text-neutral-400 uppercase">
    <span className="w-24 text-neutral-500">{label}</span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-800 accent-white"
    />
    <span className="w-12 text-right font-mono text-[0.7rem] text-white">
      {(value ?? 0).toFixed(2)}
    </span>
  </label>
)

const GlslExport: FC<{ params: CosinePaletteParams }> = ({ params }) => {
  const [copiedGlsl, setCopiedGlsl] = useState(false)
  const [copiedJson, setCopiedJson] = useState(false)

  const glslCode = useMemo(() => {
    const formatVec3 = (v: Vector3Tuple) =>
      `vec3(${v[0].toFixed(3)}, ${v[1].toFixed(3)}, ${v[2].toFixed(3)})`

    return `vec3 a = ${formatVec3(params.a)};
vec3 b = ${formatVec3(params.b)};
vec3 c = ${formatVec3(params.c)};
vec3 d = ${formatVec3(params.d)};`
  }, [params])

  const jsonCode = useMemo(() => JSON.stringify(params, null, 2), [params])

  const handleCopyGlsl = () => {
    navigator.clipboard.writeText(glslCode)
    setCopiedGlsl(true)
    setTimeout(() => setCopiedGlsl(false), 2000)
  }

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonCode)
    setCopiedJson(true)
    setTimeout(() => setCopiedJson(false), 2000)
  }

  return (
    <div className="rounded-xl border border-white/5 bg-black/10 p-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold text-white">Export</p>
        <div className="flex gap-2">
          <button
            onClick={handleCopyJson}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white transition hover:bg-white/20">
            {copiedJson ? (
              'Copied JSON!'
            ) : (
              <>
                <Copy size={12} />
                Copy JSON
              </>
            )}
          </button>
          <button
            onClick={handleCopyGlsl}
            className="flex items-center gap-2 rounded-lg bg-white/10 px-2 py-1 text-xs font-medium text-white transition hover:bg-white/20">
            {copiedGlsl ? (
              'Copied GLSL!'
            ) : (
              <>
                <Copy size={12} />
                Copy GLSL
              </>
            )}
          </button>
        </div>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-black/30 p-3 font-mono text-[0.65rem] text-neutral-400">
        {glslCode}
      </pre>
    </div>
  )
}

type ParameterConfigEntry = [PaletteParamKey, (typeof PARAMETER_CONFIG)[PaletteParamKey]]

const ColorControls: FC<{
  name: string
  hex: string
  params: CosinePaletteParams
  userColours: UserColour[]
  onNameChange: (e: ChangeEvent<HTMLInputElement>) => void
  onHexChange: (e: ChangeEvent<HTMLInputElement>) => void
  onSeed: () => void
  onParamChange: (key: PaletteParamKey, axis: number, val: number) => void
  onSave: () => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}> = ({
  name,
  hex,
  params,
  userColours,
  onNameChange,
  onHexChange,
  onSeed,
  onParamChange,
  onSave,
  onLoad,
  onDelete,
}) => {
  const formatFloat = (n: number) => n.toFixed(2)

  const swatches = useMemo(() => {
    const sampleCount = 10
    return Array.from({ length: sampleCount }, (_, index) => {
      const t = sampleCount <= 1 ? 0 : index / (sampleCount - 1)
      const colour = evaluateCosinePalette(t, params)
      return {
        hex: rgbToHex(colour),
        t,
      }
    })
  }, [params])

  return (
    <div className="space-y-6">
      {/* Anchor Hex */}
      <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <label className="flex-1 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
              Name
              <input
                type="text"
                value={name ?? ''}
                onChange={onNameChange}
                className="mt-2 w-full rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 font-mono text-sm text-white transition outline-none focus:border-white/40"
                placeholder="My Gradient"
              />
            </label>
            <button
              onClick={onSave}
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 text-white transition hover:bg-white/20"
              title="Save Config">
              <Save size={18} />
            </button>
          </div>

          <label className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
            Anchor hex
            <div className="mt-2 flex items-center gap-3">
              <input
                type="text"
                value={hex}
                onChange={onHexChange}
                className="flex-1 rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 font-mono text-sm text-white transition outline-none focus:border-white/40"
                placeholder="#ff7a18"
              />
              <span className="size-8 rounded-lg" style={{ backgroundColor: hex }} />
            </div>
          </label>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={onSeed}
              className="h-10 w-full rounded-full bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20">
              Generate from Hex
            </button>
            {userColours.length > 0 && (
              <select
                onChange={(e) => {
                  if (e.target.value) onLoad(e.target.value)
                }}
                className="h-8 rounded-lg bg-white/5 px-2 text-xs text-white outline-none hover:bg-white/10"
                value="">
                <option value="" disabled>
                  Load previous...
                </option>
                {userColours.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Swatches */}
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
              <span className="font-mono text-xs text-neutral-400">
                {formatFloat(swatch.t)}
              </span>
              <span className="font-mono text-xs text-neutral-500">{swatch.hex}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Palette Params */}

      <div className="space-y-4">
        {(Object.entries(PARAMETER_CONFIG) as ParameterConfigEntry[]).map(([key, config]) => (
          <div key={key} className="rounded-xl border border-white/5 bg-black/10 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-white">{config.label}</p>
              <span className="font-mono text-xs text-neutral-400">
                {params[key].map((v) => formatFloat(v)).join(', ')}
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
                  onChange={(val) => onParamChange(key, axisIndex, val)}
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

const TextureControls: FC<{
  config: TextureConfigState
  presets: TexturePreset[]
  userColours: UserColour[]
  update: <K extends keyof TextureConfigState>(key: K, val: TextureConfigState[K]) => void
  onSave: (name: string) => void
  onLoad: (id: string) => void
  onDelete: (id: string) => void
}> = ({ config, presets, userColours, update, onSave, onLoad, onDelete }) => {
  const [presetName, setPresetName] = useState('')

  return (
    <div className="space-y-6">
      {/* Presets */}
      <div className="rounded-xl border border-white/5 bg-neutral-900/60 p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-end gap-3">
            <label className="flex-1 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
              Save Preset
              <input
                type="text"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
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
                onChange={(e) => {
                  if (e.target.value) onLoad(e.target.value)
                }}
                className="mt-2 h-10 w-full rounded-lg bg-white/5 px-3 text-sm text-white outline-none hover:bg-white/10"
                value="">
                <option value="" disabled>
                  Select a preset...
                </option>
                {presets.length > 0 && (
                  <optgroup label="Saved Presets">
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {userColours.length > 0 && (
                  <optgroup label="From Color Palettes">
                    {userColours.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
          )}
        </div>
      </div>
      {/* Black Mix */}
      <div className="rounded-xl border border-white/5 bg-black/10 p-4">
        <p className="mb-4 text-sm font-semibold text-white">Global</p>
        <div className="space-y-3">
          <SliderControl
            label="Black Mix"
            value={config.blackMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('blackMix', v)}
          />
          <label className="flex items-center gap-3 text-xs tracking-wide text-neutral-400 uppercase">
            <span className="w-24 text-neutral-500">Overlay</span>
            <input
              type="checkbox"
              checked={config.showGradientOverlay}
              onChange={(e) => update('showGradientOverlay', e.target.checked)}
              className="size-4 rounded border-white/10 bg-neutral-800 accent-white"
            />
          </label>
          <SliderControl
            label="Gradient Range"
            value={config.gradientRange}
            min={0.25}
            max={3}
            step={0.05}
            onChange={(v) => update('gradientRange', v)}
          />
          <SliderControl
            label="Origin X"
            value={config.originX}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => update('originX', v)}
          />
          <SliderControl
            label="Origin Y"
            value={config.originY}
            min={-1}
            max={1}
            step={0.01}
            onChange={(v) => update('originY', v)}
          />
        </div>
      </div>

      {/* Grain */}

      <div className="rounded-xl border border-white/5 bg-black/10 p-4">
        <p className="mb-4 text-sm font-semibold text-white">Grainy Noise</p>
        <div className="space-y-3">
          <SliderControl
            label="Scale"
            value={config.grainScale}
            min={32}
            max={1024}
            step={32}
            onChange={(v) => update('grainScale', v)}
          />
          <SliderControl
            label="Amplitude"
            value={config.grainAmplitude}
            min={0}
            max={5}
            step={0.1}
            onChange={(v) => update('grainAmplitude', v)}
          />
          <SliderControl
            label="Mix"
            value={config.grainMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('grainMix', v)}
          />
        </div>
      </div>

      {/* FBM */}
      <div className="rounded-xl border border-white/5 bg-black/10 p-4">
        <p className="mb-4 text-sm font-semibold text-white">Fractal Noise</p>
        <div className="space-y-3">
          <SliderControl
            label="Scale"
            value={config.fbmScale}
            min={0.5}
            max={32}
            step={0.5}
            onChange={(v) => update('fbmScale', v)}
          />
          <SliderControl
            label="Octaves"
            value={config.fbmOctaves}
            min={1}
            max={12}
            step={1}
            onChange={(v) => update('fbmOctaves', v)}
          />
          <SliderControl
            label="Lacunarity"
            value={config.fbmLacunarity}
            min={1}
            max={4}
            step={0.1}
            onChange={(v) => update('fbmLacunarity', v)}
          />
          <SliderControl
            label="Gain"
            value={config.fbmGain}
            min={0.1}
            max={1}
            step={0.05}
            onChange={(v) => update('fbmGain', v)}
          />
          <SliderControl
            label="Mix"
            value={config.fbmMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('fbmMix', v)}
          />
        </div>
      </div>

      {/* Vignette */}
      <div className="rounded-xl border border-white/5 bg-black/10 p-4">
        <p className="mb-4 text-sm font-semibold text-white">Vignette</p>
        <div className="space-y-3">
          <SliderControl
            label="Strength"
            value={config.vignetteStrength}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('vignetteStrength', v)}
          />
          <SliderControl
            label="Radius"
            value={config.vignetteRadius}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('vignetteRadius', v)}
          />
          <SliderControl
            label="Smoothness"
            value={config.vignetteSmoothness}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('vignetteSmoothness', v)}
          />
        </div>
      </div>

      {/* Worley */}
      <div className="rounded-xl border border-white/5 bg-black/10 p-4">
        <p className="mb-4 text-sm font-semibold text-white">Worley Noise</p>
        <div className="space-y-3">
          <SliderControl
            label="Scale"
            value={config.worleyScale}
            min={0.5}
            max={64}
            step={0.5}
            onChange={(v) => update('worleyScale', v)}
          />
          <SliderControl
            label="Jitter"
            value={config.worleyJitter}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('worleyJitter', v)}
          />
          <SliderControl
            label="Mix"
            value={config.worleyMix}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => update('worleyMix', v)}
          />
          <label className="flex items-center gap-3 text-xs tracking-wide text-neutral-400 uppercase">
            <span className="w-24 text-neutral-500">Pattern</span>
            <select
              value={config.worleyPattern}
              onChange={(e) => update('worleyPattern', Number(e.target.value))}
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

const DownloadControls: FC<{
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
}> = ({
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

// -----------------------------------------------------------------------------
// Main Page
// -----------------------------------------------------------------------------

const ColourTextureContent: FC = () => {
  const [activeTab, setActiveTab] = useState<'color' | 'texture'>('color')
  const canvasRef = useRef<ColourTextureCanvasHandle>(null)
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
    deleteUserColour,
  } = useColourTextureStore(
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
      deleteUserColour: state.deleteUserColour,
    })),
  )
  const {
    config,
    texturePresets,
    updateConfig,
    saveTexturePreset,
    loadTexturePreset,
    deleteTexturePreset,
  } = useColourTextureStore(
    useShallow((state) => ({
      config: state.config,
      texturePresets: state.texturePresets,
      updateConfig: state.updateConfig,
      saveTexturePreset: state.saveTexturePreset,
      loadTexturePreset: state.loadTexturePreset,
      deleteTexturePreset: state.deleteTexturePreset,
    })),
  )
  const {
    resolutionPresetId,
    customResolutionInput,
    aspectWidthInput,
    aspectHeightInput,
    updateDisplay,
  } = useColourTextureStore(
    useShallow((state) => ({
      resolutionPresetId: state.display.resolutionPresetId,
      customResolutionInput: state.display.customResolutionInput,
      aspectWidthInput: state.display.aspectWidthInput,
      aspectHeightInput: state.display.aspectHeightInput,
      updateDisplay: state.updateDisplay,
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

  const handleParameterChange = useCallback(
    (key: PaletteParamKey, axisIndex: number, value: number) =>
      setPaletteParam(key, axisIndex, value),
    [setPaletteParam],
  )

  const handleResolutionPresetChange = useCallback(
    (value: string) => updateDisplay('resolutionPresetId', value),
    [updateDisplay],
  )

  const handleCustomResolutionChange = useCallback(
    (value: string) => updateDisplay('customResolutionInput', value),
    [updateDisplay],
  )

  const handleAspectWidthInputChange = useCallback(
    (value: string) => updateDisplay('aspectWidthInput', value),
    [updateDisplay],
  )

  const handleAspectHeightInputChange = useCallback(
    (value: string) => updateDisplay('aspectHeightInput', value),
    [updateDisplay],
  )

  const baseResolution = useMemo(() => {
    if (resolutionPresetId === CUSTOM_PRESET_ID) {
      return parseResolutionInput(customResolutionInput)
    }
    const preset = PRESET_RESOLUTIONS.find((entry) => entry.id === resolutionPresetId)
    return preset?.width ?? DEFAULT_EXPORT_RESOLUTION
  }, [customResolutionInput, resolutionPresetId])

  const aspectWidthValue = useMemo(() => parseAspectInput(aspectWidthInput), [aspectWidthInput])
  const aspectHeightValue = useMemo(
    () => parseAspectInput(aspectHeightInput),
    [aspectHeightInput],
  )

  const { widthMultiplier, heightMultiplier } = useMemo(
    () => getNormalizedAspectMultipliers(aspectWidthValue, aspectHeightValue),
    [aspectHeightValue, aspectWidthValue],
  )

  const downloadWidth = useMemo(
    () => clampResolution(Math.round(baseResolution * widthMultiplier)),
    [baseResolution, widthMultiplier],
  )
  const downloadHeight = useMemo(
    () => clampResolution(Math.round(baseResolution * heightMultiplier)),
    [baseResolution, heightMultiplier],
  )

  const previewAspectRatio = useMemo(() => {
    if (aspectHeightValue === 0) return 1
    return aspectWidthValue / aspectHeightValue
  }, [aspectHeightValue, aspectWidthValue])

  const handleDownload = useCallback(() => {
    if (!canvasRef.current) return

    if (resolutionPresetId === CUSTOM_PRESET_ID) {
      const safeResolution = parseResolutionInput(customResolutionInput)
      updateDisplay('customResolutionInput', String(safeResolution))
    }

    canvasRef.current.capture(downloadWidth, downloadHeight)
  }, [customResolutionInput, downloadHeight, downloadWidth, resolutionPresetId, updateDisplay])

  return (
    <main className="grid h-svh grid-cols-1 overflow-hidden text-neutral-50 lg:grid-cols-[480px_1fr]">
      {/* Controls Section */}
      <section className="flex flex-col gap-6 overflow-y-auto border-b border-white/5 p-6 lg:border-r lg:border-b-0">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold">Colour & Texture Generator</h1>
          <p className="text-sm text-neutral-400">
            Configure the cosine color palette and background texture parameters.
          </p>
        </header>

        {/* Tabs */}
        <div className="flex gap-2 rounded-lg bg-white/5 p-1">
          <button
            onClick={() => setActiveTab('color')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              activeTab === 'color'
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}>
            Color
          </button>
          <button
            onClick={() => setActiveTab('texture')}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition ${
              activeTab === 'texture'
                ? 'bg-white/10 text-white'
                : 'text-neutral-400 hover:text-white'
            }`}>
            Texture
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1">
          {activeTab === 'color' ? (
            <ColorControls
                name={name}
                hex={hex}
                params={params}
                userColours={userColours}
                onNameChange={handleNameChange}
                onHexChange={handleHexChange}
                onSeed={seedFromHex}
                onParamChange={handleParameterChange}
                onSave={saveUserColour}
                onLoad={loadUserColour}
                onDelete={deleteUserColour}
              />
          ) : (
            <TextureControls
              config={config}
              presets={texturePresets || []}
              userColours={userColours || []}
              update={updateConfig}
              onSave={saveTexturePreset}
              onLoad={loadTexturePreset}
              onDelete={deleteTexturePreset}
            />
          )}
        </div>
      </section>

      {/* Preview Section */}
      <section className="relative flex items-center justify-center overflow-hidden bg-[#000]">
        <div className="relative w-full max-w-full" style={{ maxHeight: '100%' }}>
          <Canvas
            orthographic={true}
            className="absolute inset-0 size-full"
            style={{ aspectRatio: previewAspectRatio }}
            camera={{
              position: [0, 0, 1],
              near: 0.01,
              far: 10,
              zoom: 1,
            }}
            gl={{
              alpha: false,
              antialias: true,
              preserveDrawingBuffer: true,
            }}>
            <ColourTextureCanvas ref={canvasRef} colourParams={params} textureConfig={config} />
          </Canvas>
        </div>
        <DownloadControls
          resolutionId={resolutionPresetId}
          onResolutionChange={handleResolutionPresetChange}
          customResolution={customResolutionInput}
          onCustomResolutionChange={handleCustomResolutionChange}
          aspectWidth={aspectWidthInput}
          aspectHeight={aspectHeightInput}
          onAspectWidthChange={handleAspectWidthInputChange}
          onAspectHeightChange={handleAspectHeightInputChange}
          computedWidth={downloadWidth}
          computedHeight={downloadHeight}
          onDownload={handleDownload}
        />
      </section>
    </main>
  )
}

const ColourTexturePage: FC = () => (
  <ColourTextureProvider>
    <ColourTextureContent />
  </ColourTextureProvider>
)

export default ColourTexturePage
