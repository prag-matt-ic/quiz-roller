'use client'

import { OrthographicCamera, ScreenQuad } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { button, useControls } from 'leva'
import { type FC, useCallback, useEffect, useRef } from 'react'
import { OrthographicCamera as OrthoCameraType, Vector2 } from 'three'

import {
  type BackgroundShaderUniforms,
  INITIAL_BACKGROUND_UNIFORMS,
  TextureShaderMaterial,
} from './shaders/TextureShader'

const PREVIEW_SIZE = 512

// TODO: Add palette controls. Provide cosine palette defaults + option to use "custom"
// when "custom palette" is selected, allow for one or more hex values to be entered - then generate shades from those.

// Node ordering -> the ability to drag and drop to re-order the effects.

// TODO: use natural language to describe the desired artwork - AI uses available shaders to construct the relevant nodes.
// If this is node based, maybe using WebGPU & TSL makes sense? How can the LLM "write" the code?

/**
 * TextureCanvas - Main canvas component for background texture generation
 *
 * Features:
 * - Real-time preview at lower resolution
 * - High-resolution export on demand
 * - GPU-based shader rendering
 * - Parameter control via DOM elements
 */
const TextureCanvas: FC = () => {
  return (
    <Canvas
      id="texture-canvas"
      className="!absolute !aspect-square shrink-0"
      orthographic={true}
      camera={{ position: [0, 0, 1], zoom: 1, near: 0.1, far: 10 }}>
      <TextureScene />
    </Canvas>
  )
}

export default TextureCanvas

/**
 * TextureScene - Inner scene component with shader material
 * Separated to access Three.js context
 */
const TextureScene: FC = () => {
  const gl = useThree((s) => s.gl)
  const camera = useThree((s) => s.camera) as OrthoCameraType
  const size = useThree((s) => s.size)
  const scene = useThree((s) => s.scene)

  const shaderRef = useRef<typeof TextureShaderMaterial & BackgroundShaderUniforms>(null)

  // Pre-allocated vectors for performance (per AGENTS.md)
  const resolutionRef = useRef(new Vector2(PREVIEW_SIZE, PREVIEW_SIZE))
  const accumTime = useRef(0)

  // Export settings controls with download button
  const exportSettings = useControls('Export Settings', {
    seed: {
      value: 0,
      min: 0,
      max: 300,
      step: 1,
      label: 'Seed',
    },
    resolution: {
      value: 2048,
      options: [1024, 2048, 4096, 4096 * 2],
      label: 'Resolution',
    },
    Download: button(() => captureHighResTexture()),
  })

  // Leva controls organized by helper function
  const grainControls = useControls('Grainy Noise', {
    grainEnabled: {
      value: true,
      label: 'Enabled',
    },
    grainScale: {
      value: INITIAL_BACKGROUND_UNIFORMS.uGrainScale,
      min: 32,
      max: 1024,
      step: 32,
      label: 'Scale',
    },
    grainAmplitude: {
      value: INITIAL_BACKGROUND_UNIFORMS.uGrainAmplitude,
      min: 0.0,
      max: 5.0,
      step: 0.1,
      label: 'Amplitude',
    },
    grainMix: {
      value: INITIAL_BACKGROUND_UNIFORMS.uGrainMix,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Mix Amount',
    },
  })

  const fbmControls = useControls('Fractal Noise (FBM)', {
    fbmEnabled: {
      value: true,
      label: 'Enabled',
    },
    fbmScale: {
      value: INITIAL_BACKGROUND_UNIFORMS.uFbmScale,
      min: 0.5,
      max: 32.0,
      step: 0.5,
      label: 'Scale',
    },
    fbmOctaves: {
      value: INITIAL_BACKGROUND_UNIFORMS.uFbmOctaves,
      min: 1,
      max: 12,
      step: 1,
      label: 'Octaves',
    },
    fbmLacunarity: {
      value: INITIAL_BACKGROUND_UNIFORMS.uFbmLacunarity,
      min: 1.0,
      max: 4.0,
      step: 0.1,
      label: 'Lacunarity',
    },
    fbmGain: {
      value: INITIAL_BACKGROUND_UNIFORMS.uFbmGain,
      min: 0.1,
      max: 1.0,
      step: 0.05,
      label: 'Gain',
    },
    fbmMix: {
      value: INITIAL_BACKGROUND_UNIFORMS.uFbmMix,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Mix Amount',
    },
  })

  const vignetteControls = useControls('Vignette', {
    vignetteEnabled: {
      value: true,
      label: 'Enabled',
    },
    vignetteStrength: {
      value: INITIAL_BACKGROUND_UNIFORMS.uVignetteStrength,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Strength',
    },
    vignetteRadius: {
      value: INITIAL_BACKGROUND_UNIFORMS.uVignetteRadius,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Radius',
    },
    vignetteSmoothness: {
      value: INITIAL_BACKGROUND_UNIFORMS.uVignetteSmoothness,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Smoothness',
    },
  })

  const worleyControls = useControls('Worley Noise', {
    worleyEnabled: {
      value: true,
      label: 'Enabled',
    },
    worleyScale: {
      value: INITIAL_BACKGROUND_UNIFORMS.uWorleyScale,
      min: 0.5,
      max: 64.0,
      step: 0.5,
      label: 'Scale',
    },
    worleyJitter: {
      value: INITIAL_BACKGROUND_UNIFORMS.uWorleyJitter,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Jitter',
    },
    worleyManhattan: {
      value: INITIAL_BACKGROUND_UNIFORMS.uWorleyManhattan,
      label: 'Manhattan Distance',
    },
    worleyPattern: {
      value: 'F2-F1',
      options: ['F1', 'F2', 'F2-F1'],
      label: 'Pattern Type',
    },
    worleyMix: {
      value: INITIAL_BACKGROUND_UNIFORMS.uWorleyMix,
      min: 0.0,
      max: 1.0,
      step: 0.01,
      label: 'Mix Amount',
    },
  })

  /**
   * Capture high-resolution texture and download as JPG
   * Temporarily renders at target resolution, captures, then restores preview size
   */
  const captureHighResTexture = useCallback(() => {
    if (!gl || !shaderRef.current) {
      console.error('Canvas not ready for capture')
      return
    }

    try {
      // Get export settings from Leva controls
      const targetResolution = exportSettings.resolution
      const seed = exportSettings.seed

      // Store original size
      const originalWidth = gl.domElement.width
      const originalHeight = gl.domElement.height
      const originalPixelRatio = gl.getPixelRatio()

      // Set high-res rendering
      gl.setPixelRatio(1) // Avoid DPR multiplication
      gl.setSize(targetResolution, targetResolution, false)

      // Update shader resolution uniform
      shaderRef.current.uResolution.set(targetResolution, targetResolution)
      shaderRef.current.uSeed = seed

      // Update camera for square viewport
      camera.left = -1
      camera.right = 1
      camera.top = 1
      camera.bottom = -1
      camera.updateProjectionMatrix()

      // Render single frame at high resolution
      gl.render(scene, camera)

      // Capture as JPG
      gl.domElement.toBlob(
        (blob) => {
          if (!blob) {
            console.error('Failed to create blob')
            return
          }
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5)
          link.download = `background-${targetResolution}-seed${seed}-${timestamp}.jpg`
          link.href = url
          link.click()
          URL.revokeObjectURL(url)
        },
        'image/jpeg',
        1.0,
      )

      // Restore preview size
      gl.setPixelRatio(originalPixelRatio)
      gl.setSize(originalWidth / originalPixelRatio, originalHeight / originalPixelRatio, false)
      shaderRef.current.uResolution.set(PREVIEW_SIZE, PREVIEW_SIZE)

      // Restore camera
      camera.left = -1
      camera.right = 1
      camera.top = 1
      camera.bottom = -1
      camera.updateProjectionMatrix()
    } catch (error) {
      console.error('Error capturing texture:', error)
    }
  }, [gl, camera, scene, exportSettings.resolution, exportSettings.seed])

  // Update shader uniforms each frame
  useFrame((_, delta) => {
    if (!shaderRef.current) return

    // Accumulate time for animation
    accumTime.current += delta

    // Update uniforms in place (no allocations per AGENTS.md)
    shaderRef.current.uTime = accumTime.current
    shaderRef.current.uSeed = exportSettings.seed

    // Update from Leva controls - apply enabled toggle by zeroing mix/strength
    shaderRef.current.uGrainScale = grainControls.grainScale
    shaderRef.current.uGrainAmplitude = grainControls.grainAmplitude
    shaderRef.current.uGrainMix = grainControls.grainEnabled ? grainControls.grainMix : 0

    shaderRef.current.uFbmScale = fbmControls.fbmScale
    shaderRef.current.uFbmOctaves = fbmControls.fbmOctaves
    shaderRef.current.uFbmLacunarity = fbmControls.fbmLacunarity
    shaderRef.current.uFbmGain = fbmControls.fbmGain
    shaderRef.current.uFbmMix = fbmControls.fbmEnabled ? fbmControls.fbmMix : 0

    shaderRef.current.uVignetteStrength = vignetteControls.vignetteEnabled
      ? vignetteControls.vignetteStrength
      : 0
    shaderRef.current.uVignetteRadius = vignetteControls.vignetteRadius
    shaderRef.current.uVignetteSmoothness = vignetteControls.vignetteSmoothness

    // Worley Noise - Convert pattern string to int and apply enabled toggle
    shaderRef.current.uWorleyScale = worleyControls.worleyScale
    shaderRef.current.uWorleyJitter = worleyControls.worleyJitter
    shaderRef.current.uWorleyManhattan = worleyControls.worleyManhattan ? 1 : 0
    const patternMap = { F1: 0, F2: 1, 'F2-F1': 2 }
    shaderRef.current.uWorleyPattern =
      patternMap[worleyControls.worleyPattern as keyof typeof patternMap]
    shaderRef.current.uWorleyMix = worleyControls.worleyEnabled ? worleyControls.worleyMix : 0
  })

  // Update resolution when canvas size changes
  useEffect(() => {
    resolutionRef.current.set(size.width, size.height)
    if (shaderRef.current) {
      shaderRef.current.uResolution = resolutionRef.current
    }
  }, [size])

  return (
    <>
      <OrthographicCamera makeDefault={true} position={[0, 0, 1]} zoom={1} />
      <ScreenQuad>
        {/* ScreenQuad geometry: full-screen quad in NDC space */}
        <planeGeometry args={[2, 2, 1, 1]} />
        <TextureShaderMaterial
          ref={shaderRef}
          {...INITIAL_BACKGROUND_UNIFORMS}
          uResolution={resolutionRef.current}
        />
      </ScreenQuad>
    </>
  )
}
