import { ScreenQuad } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react'
import { OrthographicCamera, ShaderMaterial, Vector2 } from 'three'

import {
  ColourTextureShader,
  type ColourTextureShaderUniforms,
  INITIAL_COLOUR_TEXTURE_UNIFORMS,
} from '../shaders/ColourTextureShader'
import { clampResolution } from '../utils'
import type { CosinePaletteParams, TextureConfigState } from '../store/types'

const PREVIEW_SIZE = 512
const ColourTextureShaderMaterial = extend(ColourTextureShader)

export type ColourTextureCanvasHandle = {
  capture: (width: number, height: number) => void
}

export type ColourTextureCanvasProps = {
  colourParams: CosinePaletteParams
  textureConfig: TextureConfigState
}

export const ColourTextureCanvas = forwardRef<ColourTextureCanvasHandle, ColourTextureCanvasProps>(
  ({ colourParams, textureConfig }, ref) => {
    const shaderRef = useRef<(ShaderMaterial & ColourTextureShaderUniforms) | null>(null)
    const size = useThree((state) => state.size)
    const gl = useThree((state) => state.gl)
    const scene = useThree((state) => state.scene)
    const camera = useThree((state) => state.camera) as OrthographicCamera
    const accumTime = useRef(0)

    const resolutionUniform = useMemo(() => new Vector2(PREVIEW_SIZE, PREVIEW_SIZE), [])

    useImperativeHandle(ref, () => ({
      capture: (targetWidth: number, targetHeight: number) => {
        if (!gl || !shaderRef.current) return

        try {
          const safeWidth = clampResolution(targetWidth)
          const safeHeight = clampResolution(targetHeight)

          const originalWidth = gl.domElement.width
          const originalHeight = gl.domElement.height
          const originalPixelRatio = gl.getPixelRatio()

          gl.setPixelRatio(1)
          gl.setSize(safeWidth, safeHeight, false)

          shaderRef.current.uResolution.set(safeWidth, safeHeight)
          shaderRef.current.uSampleWeight = 1

          const wasOverlayEnabled = shaderRef.current.uShowGradientOverlay
          shaderRef.current.uShowGradientOverlay = false

          const originalLeft = camera.left
          const originalRight = camera.right
          const originalTop = camera.top
          const originalBottom = camera.bottom

          camera.left = -1
          camera.right = 1
          camera.top = 1
          camera.bottom = -1
          camera.updateProjectionMatrix()

          gl.render(scene, camera)

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

          gl.setPixelRatio(originalPixelRatio)
          gl.setSize(originalWidth / originalPixelRatio, originalHeight / originalPixelRatio, false)
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

      shaderRef.current.uA.set(...colourParams.a)
      shaderRef.current.uB.set(...colourParams.b)
      shaderRef.current.uC.set(...colourParams.c)
      shaderRef.current.uD.set(...colourParams.d)

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
  },
)

ColourTextureCanvas.displayName = 'ColourTextureCanvas'
