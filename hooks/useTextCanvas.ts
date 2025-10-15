import { useEffect, useState } from 'react'
import { CanvasTexture, ClampToEdgeWrapping, LinearFilter } from 'three'

export type CanvasState = {
  canvas: HTMLCanvasElement
  context: CanvasRenderingContext2D
  texture: CanvasTexture
}

export type TextDrawOptions = {
  width: number
  height: number
  color?: string
  fontFamily?: string
  fontWeight?: number | string
  baseFontScale?: number // relative to height (e.g. 0.1)
  scaleStep?: number // e.g. 0.9 (reduce by 10%)
  minScale?: number // e.g. 0.5 (50%)
  paddingXFrac?: number // each side fraction (e.g. 0.08)
  paddingYFrac?: number // top/bottom fraction (e.g. 0.12)
  textAlign?: CanvasTextAlign
  textBaseline?: CanvasTextBaseline
}

const DEFAULTS: Required<Omit<TextDrawOptions, 'width' | 'height'>> = {
  color: '#ffffff',
  fontFamily: '"Nunito Sans", system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
  fontWeight: 500,
  baseFontScale: 0.1,
  scaleStep: 0.9,
  minScale: 0.5,
  paddingXFrac: 0.08,
  paddingYFrac: 0.12,
  textAlign: 'center',
  textBaseline: 'middle',
}

export function setupCanvasTexture(width: number, height: number): CanvasState {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.style.display = 'none'

  const context = canvas.getContext('2d', { alpha: true })
  if (!context) throw new Error('Failed to get canvas 2D context')

  const texture = new CanvasTexture(canvas)
  texture.generateMipmaps = false
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.wrapS = ClampToEdgeWrapping
  texture.wrapT = ClampToEdgeWrapping

  return { canvas, context, texture }
}

export function writeTextToCanvas(
  context: CanvasRenderingContext2D,
  text: string,
  opts: TextDrawOptions,
): void {
  const options = { ...DEFAULTS, ...opts }
  const { width, height } = options

  // Clear + transparent background
  context.clearRect(0, 0, width, height)
  context.fillStyle = 'rgba(0,0,0,0)'
  context.fillRect(0, 0, width, height)

  const x = width / 2
  const y = height / 2

  const maxTextWidth = width * (1 - options.paddingXFrac * 2)
  const maxTextHeight = height * (1 - options.paddingYFrac * 2)

  // Determine base font size and shrink in steps until it fits
  let fontSize = Math.max(8, Math.floor(height * options.baseFontScale))
  const minFontSize = Math.max(8, Math.floor(fontSize * options.minScale))

  const setFont = () => {
    context.font = `${options.fontWeight} ${fontSize}px ${options.fontFamily}`
  }
  setFont()

  for (let i = 0; i < 10; i++) {
    const metrics = context.measureText(text)
    const tooWide = metrics.width > maxTextWidth
    const tooTall = fontSize > maxTextHeight
    if (!tooWide && !tooTall) break
    const nextSize = Math.max(minFontSize, Math.floor(fontSize * options.scaleStep))
    if (nextSize === fontSize) break
    fontSize = nextSize
    setFont()
  }

  context.textAlign = options.textAlign
  context.textBaseline = options.textBaseline
  context.fillStyle = options.color
  context.fillText(text, x, y)
}

export type UseTextCanvasOptions = TextDrawOptions

export function useTextCanvas(text: string, options: UseTextCanvasOptions): CanvasState | null {
  const [state, setState] = useState<CanvasState | null>(null)

  useEffect(() => {
    const cs = setupCanvasTexture(options.width, options.height)
    setState(cs)
    return () => {
      cs.texture.dispose()
    }
  }, [options.height, options.width])

  useEffect(() => {
    if (!state) return
    writeTextToCanvas(state.context, text, options)
    state.texture.needsUpdate = true
  }, [state, text, options])

  return state
}
