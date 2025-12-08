import { ScreenQuad, shaderMaterial, useFBO } from '@react-three/drei'
import { createPortal, extend, useFrame, useThree } from '@react-three/fiber'
import { type FC, type PropsWithChildren, useMemo, useRef } from 'react'
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
}

const EFFECTS_INITIAL_UNIFORMS: EffectsUniforms = {
  uTime: 0,
  uResolution: [0, 0],
  uSceneTexture: null,
  uSpeed: 0,
}

const EffectsShader = shaderMaterial(EFFECTS_INITIAL_UNIFORMS, vertexShader, fragmentShader)

const EffectsShaderMaterial = extend(EffectsShader)

const Postprocessing: FC<PropsWithChildren> = ({ children }) => {
  const sceneQuality = usePerformanceStore((s) => s.sceneQuality)
  const isEnabled = sceneQuality === SceneQuality.HIGH

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

  const { input: playerInput } = usePlayerInput()
  const { speedUnits: playerSpeedUnits } = usePlayerSpeed()

  useFrame(({ gl, scene, camera, clock }) => {
    if (!isEnabled) return
    if (!material.current) return
    // Render the FBO scene (offscreen) into the render target
    gl.setRenderTarget(renderTarget)
    gl.render(fboScene, camera)
    gl.setRenderTarget(null)

    // Update the shader uniforms
    const inputDirectionZ = playerInput.current.up - playerInput.current.down
    const speedUnits = playerSpeedUnits.current
    const signedSpeed = Math.max(
      -1,
      Math.min(1, (inputDirectionZ * speedUnits) / PLAYER_SPEED_MAX),
    )

    material.current.uSceneTexture = renderTarget.texture
    material.current.uTime = clock.elapsedTime
    material.current.uSpeed = signedSpeed
    // Render the effects scene (default scene) using the effects shader
    gl.render(scene, orthographicCamera)
  }, 1)

  if (!isEnabled) return children

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
        />
      </ScreenQuad>
    </>
  )
}

export default Postprocessing
