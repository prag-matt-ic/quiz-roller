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
import { OrthographicCamera, Vector2, type Vector3Tuple } from 'three'
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
  PARAMETER_CONFIG,
  TAU,
} from '@/components/dev/colourTexture/store/constants'
import type {
  CosinePaletteParams,
  PaletteParamKey,
  TextureConfigState,
} from '@/components/dev/colourTexture/store/types'

// -----------------------------------------------------------------------------
// Types & Constants
// -----------------------------------------------------------------------------

const ColourTextureShaderMaterial = extend(ColourTextureShader)

const PREVIEW_SIZE = 512

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const clampUnit = (value: number) => clamp(value, 0, 1)

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
  capture: (resolution: number) => void
}

const ColourTextureCanvas = forwardRef<
  ColourTextureCanvasHandle,
  {
    colourParams: CosinePaletteParams
    textureConfig: TextureConfigState
  }
>(({ colourParams, textureConfig }, ref) => {
  const shaderRef = useRef<ColourTextureShaderUniforms & any>(null)
  const size = useThree((s) => s.size)
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera) as OrthographicCamera
  const accumTime = useRef(0)

  // Pre-allocated vectors
  const resolutionUniform = useMemo(() => new Vector2(PREVIEW_SIZE, PREVIEW_SIZE), [])

  useImperativeHandle(ref, () => ({
    capture: (targetResolution: number) => {
      if (!gl || !shaderRef.current) return

      try {
        // Store original state
        const originalWidth = gl.domElement.width
        const originalHeight = gl.domElement.height
        const originalPixelRatio = gl.getPixelRatio()

        // Set high-res rendering
        gl.setPixelRatio(1)
        gl.setSize(targetResolution, targetResolution, false)

        // Update shader resolution
        shaderRef.current.uResolution.set(targetResolution, targetResolution)
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
            link.download = `texture-${targetResolution}-${timestamp}.jpg`
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
      {value.toFixed(2)}
    </span>
  </label>
)

const ColorControls: FC<{
  hex: string
  params: CosinePaletteParams
  onHexChange: (e: ChangeEvent<HTMLInputElement>) => void
  onSeed: () => void
  onParamChange: (key: PaletteParamKey, axis: number, val: number) => void
}> = ({ hex, params, onHexChange, onSeed, onParamChange }) => {
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
        <div className="flex flex-wrap gap-4 md:flex-nowrap md:items-end">
          <label className="flex-1 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
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
          <button
            type="button"
            onClick={onSeed}
            className="h-10 flex-none rounded-full bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20">
            Seed
          </button>
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
        {(Object.entries(PARAMETER_CONFIG) as Array<[PaletteParamKey, any]>).map(
          ([key, config]) => (
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
          ),
        )}
      </div>
    </div>
  )
}

const TextureControls: FC<{
  config: TextureConfigState
  update: <K extends keyof TextureConfigState>(key: K, val: TextureConfigState[K]) => void
}> = ({ config, update }) => {
  return (
    <div className="space-y-6">
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

const DownloadControls: FC<{ onDownload: (res: number) => void }> = ({ onDownload }) => {
  const [resolution, setResolution] = useState(2048)

  return (
    <div className="absolute right-6 bottom-6 flex items-center gap-2 rounded-xl border border-white/10 bg-neutral-900/80 p-2 backdrop-blur-md">
      <select
        value={resolution}
        onChange={(e) => setResolution(Number(e.target.value))}
        className="h-9 rounded-lg bg-white/5 px-3 text-xs font-medium text-white transition outline-none hover:bg-white/10 focus:bg-white/10">
        <option value={1024}>1K (1024x1024)</option>
        <option value={2048}>2K (2048x2048)</option>
        <option value={4096}>4K (4096x4096)</option>
      </select>
      <button
        onClick={() => onDownload(resolution)}
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
  const { hex, params, setHex, seedFromHex, setPaletteParam } = useColourTextureStore(
    useShallow((state) => ({
      hex: state.hex,
      params: state.params,
      setHex: state.setHex,
      seedFromHex: state.seedFromHex,
      setPaletteParam: state.setPaletteParam,
    })),
  )
  const { config, updateConfig } = useColourTextureStore(
    useShallow((state) => ({
      config: state.config,
      updateConfig: state.updateConfig,
    })),
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
              hex={hex}
              params={params}
              onHexChange={handleHexChange}
              onSeed={seedFromHex}
              onParamChange={handleParameterChange}
            />
          ) : (
            <TextureControls config={config} update={updateConfig} />
          )}
        </div>
      </section>

      {/* Preview Section */}
      <section className="relative min-h-[360px]">
        <Canvas
          orthographic
          className="absolute! inset-0 size-full!"
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
        <DownloadControls onDownload={(res) => canvasRef.current?.capture(res)} />
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
