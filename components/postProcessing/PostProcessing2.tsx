import { ScreenQuad, shaderMaterial, useFBO } from '@react-three/drei'
import { createPortal, extend, useFrame, useThree } from '@react-three/fiber'
import { type FC, type PropsWithChildren, useEffect, useMemo, useRef } from 'react'
import { OrthographicCamera, Scene, Texture } from 'three'

import { SceneQuality, usePerformanceStore } from '@/components/PerformanceProvider'
import { usePlayerInput } from '@/hooks/usePlayerInput'
import usePlayerSpeed from '@/hooks/usePlayerSpeed'
import { PLAYER_SPEED_MAX } from '@/stores/playerSlice'

import fragmentShader from './postProcessing.frag'
import vertexShader from './postProcessing.vert'

type EffectsUniforms = {
  uTime: number
  uResolution: [number, number]
  uSceneTexture: Texture | null
  uSpeed: number
  uBlurSteps: number
}

const INITIAL_UNIFORMS: EffectsUniforms = {
  uTime: 0,
  uResolution: [1, 1],
  uSceneTexture: null,
  uSpeed: 0,
  uBlurSteps: 0,
}

const EffectsShader = shaderMaterial(INITIAL_UNIFORMS, vertexShader, fragmentShader)

const EffectsShaderMaterial = extend(EffectsShader)

const BLUR_SAMPLES_BY_QUALITY: Record<SceneQuality, number> = {
  [SceneQuality.HIGH]: 16,
  [SceneQuality.MEDIUM]: 6,
  [SceneQuality.LOW]: 0,
}

const PostProcessing: FC<PropsWithChildren> = ({ children }) => {
  const sceneQuality = usePerformanceStore((s) => s.sceneQuality)
  const blurSteps = BLUR_SAMPLES_BY_QUALITY[sceneQuality]
  const isEnabled = blurSteps > 0

  const { viewport } = useThree()
  const material = useRef<typeof EffectsShaderMaterial & EffectsUniforms>(null)

  const fboScene = useMemo(() => new Scene(), [])
  const renderTarget = useFBO({ stencilBuffer: false }) // https://drei.docs.pmnd.rs/misc/fbo-use-fbo
  const orthographicCamera = useMemo(() => {
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    camera.position.z = 1
    camera.updateProjectionMatrix()
    return camera
  }, [])

  const { input } = usePlayerInput()
  const { speedUnits } = usePlayerSpeed()

  useEffect(() => {
    if (!material.current) return
    material.current.uBlurSteps = blurSteps
  }, [blurSteps])

  useFrame(({ gl, scene, camera, clock }) => {
    if (isEnabled && !!material.current) {
      // Render the FBO scene (offscreen) into the render target
      gl.setRenderTarget(renderTarget)
      gl.render(fboScene, camera)
      gl.setRenderTarget(null)
      // Update the shader uniforms
      const inputZ = input.current.up - input.current.down
      const signedSpeed = Math.max(
        -1,
        Math.min(1, (inputZ * speedUnits.current) / PLAYER_SPEED_MAX),
      )
      material.current.uSceneTexture = renderTarget.texture
      material.current.uTime = clock.elapsedTime
      material.current.uSpeed = signedSpeed
      material.current.uBlurSteps = blurSteps
      // Render the effects scene (default scene) using the effects shader
      gl.render(scene, orthographicCamera)
    } else {
      // If not enabled, just render the original scene
      gl.render(fboScene, camera)
    }
  }, 1)

  return (
    <>
      {createPortal(children, fboScene)}
      <ScreenQuad>
        <EffectsShaderMaterial
          key={EffectsShader.key}
          ref={material}
          uTime={0}
          uResolution={[viewport.width, viewport.height]}
          uSceneTexture={null}
          uSpeed={0}
          uBlurSteps={blurSteps}
        />
      </ScreenQuad>
    </>
  )
}

export default PostProcessing
