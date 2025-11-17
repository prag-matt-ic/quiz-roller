'use client'

// Developer page for generating cosine palette parameters from a base hex colour.
// https://github.com/thi-ng/color/blob/master/src/gradients.org
// https://dev.thi.ng/gradients/

import { ScreenQuad, shaderMaterial } from '@react-three/drei'
import { Canvas, extend, useThree } from '@react-three/fiber'
import { rgb } from '@thi.ng/color'
import {
  type ChangeEvent,
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Vector2, Vector3, type Vector3Tuple } from 'three'

import { rgbToHex } from '@/components/palette'

import gradientPreviewFragment from './gradientPreview.frag'
import gradientPreviewVertex from './gradientPreview.vert'

const DEFAULT_HEX = '#ff7a18'

const TAU = Math.PI * 2

type CosinePaletteParams = {
  a: Vector3Tuple
  b: Vector3Tuple
  c: Vector3Tuple
  d: Vector3Tuple
}

type PaletteParamKey = keyof CosinePaletteParams

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

const parseHexToTuple = (hex: string): Vector3Tuple => {
  try {
    const colour = rgb(hex)
    return [clampUnit(colour.r), clampUnit(colour.g), clampUnit(colour.b)]
  } catch {
    return [1, 0.478, 0.094]
  }
}

const guessParamsFromHex = (hex: string): CosinePaletteParams => {
  const base = parseHexToTuple(hex)
  const inverted = base.map((channel) => 1 - channel) as Vector3Tuple
  const luminance = clampUnit(0.2126 * base[0] + 0.7152 * base[1] + 0.0722 * base[2])
  return {
    a: [
      clampUnit(0.25 + base[0] * 0.5),
      clampUnit(0.25 + base[1] * 0.5),
      clampUnit(0.25 + base[2] * 0.5),
    ],
    b: [
      clampUnit(0.15 + inverted[0] * 0.6),
      clampUnit(0.15 + inverted[1] * 0.6),
      clampUnit(0.15 + inverted[2] * 0.6),
    ],
    c: [
      clamp(0.6 + base[0] * 0.6, 0.25, 1.8),
      clamp(0.6 + base[1] * 0.6, 0.25, 1.8),
      clamp(0.6 + base[2] * 0.6, 0.25, 1.8),
    ],
    d: [
      clamp(0.05 + luminance * 0.35 + inverted[0] * 0.15, -0.5, 1),
      clamp(0.05 + luminance * 0.35 + inverted[1] * 0.15, -0.5, 1),
      clamp(0.05 + luminance * 0.35 + inverted[2] * 0.15, -0.5, 1),
    ],
  }
}

const DEFAULT_PARAMS: CosinePaletteParams = {
  a: [0.5, 0.5, 0.5],
  b: [0.5, 0.5, 0.5],
  c: [1.0, 0.7, 0.4],
  d: [0, 0.15, 0.2],
}

type ParameterControlConfig = {
  label: string
  min: number
  max: number
  step: number
}

const PARAMETER_CONFIG: Record<PaletteParamKey, ParameterControlConfig> = {
  a: { label: 'Offset (a)', min: 0, max: 1, step: 0.01 },
  b: { label: 'Amplitude (b)', min: 0, max: 1, step: 0.01 },
  c: { label: 'Frequency (c)', min: 0, max: 2, step: 0.01 },
  d: { label: 'Phase (d)', min: -1, max: 1, step: 0.01 },
}

const AXIS_LABELS = ['X', 'Y', 'Z'] as const

const formatFloat = (value: number, fractionDigits = 4) =>
  value.toFixed(fractionDigits).replace(/\.?0+$/, '')

const formatVector = (label: string, values: Vector3Tuple) =>
  `const vec3 ${label.toUpperCase()} = vec3(${formatFloat(values[0])}, ${formatFloat(values[1])}, ${formatFloat(values[2])});`

const getGlslSnippet = (params: CosinePaletteParams) => {
  const lines = [
    formatVector('a', params.a),
    formatVector('b', params.b),
    formatVector('c', params.c),
    formatVector('d', params.d),
    '',
    'vec3 cosinePalette(float t) {',
    '  return A + B * cos(6.283185 * (C * t + D));',
    '}',
  ]
  return lines.join('\n')
}

const SAMPLE_COUNT = 10

const GradientPreviewShader = shaderMaterial(
  {
    uA: new Vector3(...DEFAULT_PARAMS.a),
    uB: new Vector3(...DEFAULT_PARAMS.b),
    uC: new Vector3(...DEFAULT_PARAMS.c),
    uD: new Vector3(...DEFAULT_PARAMS.d),
    uResolution: new Vector2(1, 1),
  },
  gradientPreviewVertex,
  gradientPreviewFragment,
)
const GradientPreviewMaterial = extend(GradientPreviewShader)

type GradientPreviewShaderUniforms = {
  uA: Vector3
  uB: Vector3
  uC: Vector3
  uD: Vector3
  uResolution: Vector2
}

const GradientPreview: FC<{ params: CosinePaletteParams }> = ({ params }) => {
  const shader = useRef<typeof GradientPreviewMaterial & GradientPreviewShaderUniforms>(null)
  const size = useThree((state) => state.size)

  useEffect(() => {
    if (!shader.current) return
    shader.current.uA.set(params.a[0], params.a[1], params.a[2])
    shader.current.uB.set(params.b[0], params.b[1], params.b[2])
    shader.current.uC.set(params.c[0], params.c[1], params.c[2])
    shader.current.uD.set(params.d[0], params.d[1], params.d[2])
  }, [params])

  useEffect(() => {
    if (!shader.current) return
    shader.current.uResolution.set(size.width, size.height)
  }, [size.height, size.width])

  return (
    <ScreenQuad>
      <GradientPreviewMaterial key={GradientPreviewShader.key} ref={shader} />
    </ScreenQuad>
  )
}

const GradientGeneratorPage: FC = () => {
  const [hex, setHex] = useState(DEFAULT_HEX)
  const [parameters, setParameters] = useState<CosinePaletteParams>(DEFAULT_PARAMS)

  const handleSeedFromHex = useCallback(() => {
    setParameters(guessParamsFromHex(hex))
  }, [hex])

  const handleHexChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setHex(event.target.value)
  }, [])

  const handleParameterChange = useCallback(
    (key: PaletteParamKey, axisIndex: number, event: ChangeEvent<HTMLInputElement>) => {
      const numericValue = Number(event.target.value)
      setParameters((prev) => {
        const nextVector = [...prev[key]] as Vector3Tuple
        const config = PARAMETER_CONFIG[key]
        nextVector[axisIndex] = clamp(numericValue, config.min, config.max)
        return {
          ...prev,
          [key]: nextVector,
        }
      })
    },
    [],
  )

  const params = parameters

  const glslSnippet = useMemo(() => getGlslSnippet(params), [params])

  const swatches = useMemo(() => {
    const sampleCount: number = SAMPLE_COUNT
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
    <main className="grid h-svh grid-cols-1 overflow-hidden text-neutral-50 lg:grid-cols-[480px_1fr]">
      <section className="flex flex-col gap-6 overflow-y-auto border-b border-white/5 p-6 lg:border-r lg:border-b-0">
        <header className="space-y-2">
          <h1 className="text-xl font-semibold">Cosine palette generator</h1>
          <p className="text-sm text-neutral-400">
            Choose an anchor colour, tune the cosine parameters, and copy the GLSL block once
            the gradient looks right.
          </p>
        </header>

        <section className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 md:flex-nowrap md:items-end">
              <label className="flex-1 text-xs font-semibold tracking-widest text-neutral-400 uppercase">
                Anchor hex
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="text"
                    value={hex}
                    onChange={handleHexChange}
                    className="flex-1 rounded-lg border border-white/10 bg-neutral-950/60 px-3 py-2 font-mono text-sm text-white transition outline-none focus:border-white/40"
                    placeholder="#ff7a18"
                  />
                  <span
                    aria-label="Anchor colour preview"
                    className="size-8 rounded-lg"
                    style={{ backgroundColor: hex }}
                  />
                </div>
              </label>
              <button
                type="button"
                onClick={handleSeedFromHex}
                className="h-10 flex-none rounded-full bg-white/10 px-4 text-sm font-medium text-white transition hover:bg-white/20">
                Seed from hex
              </button>
            </div>

            <div className="space-y-6">
              {(
                Object.entries(PARAMETER_CONFIG) as Array<
                  [PaletteParamKey, ParameterControlConfig]
                >
              ).map(([key, config]) => {
                const vector = params[key]
                return (
                  <div key={key} className="rounded-xl border border-white/5 bg-black/10 p-4">
                    <div className="mb-4 flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-white">{config.label}</p>
                      <span className="font-mono text-xs text-neutral-400">
                        {vector.map((value) => formatFloat(value, 2)).join(', ')}
                      </span>
                    </div>
                    <div className="space-y-3">
                      {AXIS_LABELS.map((axisLabel, axisIndex) => (
                        <label
                          key={axisLabel}
                          className="flex items-center gap-3 text-xs tracking-wide text-neutral-400 uppercase">
                          <span className="w-4 text-center text-neutral-500">{axisLabel}</span>
                          <input
                            type="range"
                            min={config.min}
                            max={config.max}
                            step={config.step}
                            value={vector[axisIndex]}
                            onChange={(event) => handleParameterChange(key, axisIndex, event)}
                            className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-neutral-800 accent-white"
                          />
                          <span className="w-12 text-right font-mono text-[0.7rem] text-white">
                            {formatFloat(vector[axisIndex], 2)}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

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
                  {formatFloat(swatch.t, 2)}
                </span>
                <span className="font-mono text-xs text-neutral-500">{swatch.hex}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-neutral-900/60 p-4">
          <p className="text-xs font-semibold tracking-widest text-neutral-400 uppercase">
            GLSL
          </p>
          <pre className="mt-3 overflow-x-auto rounded-lg bg-neutral-900/80 p-3 text-xs text-green-200">
            {glslSnippet}
          </pre>
        </div>
      </section>
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
          <GradientPreview params={params} />
        </Canvas>
      </section>
    </main>
  )
}

export default GradientGeneratorPage
