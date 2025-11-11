'use client'

import { useFrame, useThree } from '@react-three/fiber'
import { type FC, useEffect, useRef } from 'react'
import {
  ClampToEdgeWrapping,
  Color,
  LinearSRGBColorSpace,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  Vector2,
  Vector4,
  WebGLRenderTarget,
  WebGLRenderer,
} from 'three'

import { useGameStore, useGameStoreAPI } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { TextureShaderMaterial } from '@/components/textureGenerator/shaders/TextureShader'
import { CyclingBackgroundMaterial } from '@/components/background/shaders/CyclingBackgroundMaterial'
import { TRANSPARENT_TEXTURE } from '@/hooks/useTextCanvas'
import {
  useBackgroundStore,
  type BackgroundShaderConfig,
} from '@/components/BackgroundProvider'

const MAX_POOL_SIZE = 8
const SAMPLE_TIME_STEP = 2.0
const MIN_RENDER_DIMENSION = 1
const CLEAR_COLOR_HEX = 0x000000
const FULLSCREEN_PLANE_SIZE = 2
const FRAME_SAMPLE_WEIGHT = 1

const FULLSCREEN_CAMERA_BOUNDS = {
  left: -1,
  right: 1,
  top: 1,
  bottom: -1,
  near: 0,
  far: 1,
} as const

type BackgroundMaterialInstance = InstanceType<typeof TextureShaderMaterial>
type CyclingBackgroundMaterialInstance = InstanceType<typeof CyclingBackgroundMaterial>

type Dimensions = {
  width: number
  height: number
}

type CycleState = {
  progress: number
  speed: number
}

const FALLBACK_DIMENSIONS: Dimensions = { width: 1, height: 1 }

const createFullscreenCamera = () =>
  new OrthographicCamera(
    FULLSCREEN_CAMERA_BOUNDS.left,
    FULLSCREEN_CAMERA_BOUNDS.right,
    FULLSCREEN_CAMERA_BOUNDS.top,
    FULLSCREEN_CAMERA_BOUNDS.bottom,
    FULLSCREEN_CAMERA_BOUNDS.near,
    FULLSCREEN_CAMERA_BOUNDS.far,
  )

const createFullscreenGeometry = () =>
  new PlaneGeometry(FULLSCREEN_PLANE_SIZE, FULLSCREEN_PLANE_SIZE)

const computeRenderDimensions = ({
  baseSize,
  pixelRatio,
  renderScale,
}: {
  baseSize: Dimensions
  pixelRatio: number
  renderScale: number
}): Dimensions => {
  const width = Math.max(
    MIN_RENDER_DIMENSION,
    Math.round(baseSize.width * renderScale * pixelRatio),
  )
  const height = Math.max(
    MIN_RENDER_DIMENSION,
    Math.round(baseSize.height * renderScale * pixelRatio),
  )
  return { width, height }
}

const configureGeneratorMaterial = ({
  material,
  shaderConfig,
  paletteIndex,
  resolution,
  baseSize,
}: {
  material: BackgroundMaterialInstance
  shaderConfig: BackgroundShaderConfig
  paletteIndex: number
  resolution: Vector2
  baseSize: Dimensions
}): void => {
  resolution.set(baseSize.width, baseSize.height)
  material.uResolution.copy(resolution)
  material.uGrainScale = shaderConfig.grainScale
  material.uGrainAmplitude = shaderConfig.grainAmplitude
  material.uGrainMix = shaderConfig.grainEnabled ? shaderConfig.grainMix : 0
  material.uFbmScale = shaderConfig.fbmScale
  material.uFbmOctaves = Math.max(1, Math.round(shaderConfig.fbmOctaves))
  material.uFbmLacunarity = shaderConfig.fbmLacunarity
  material.uFbmGain = shaderConfig.fbmGain
  material.uFbmMix = shaderConfig.fbmEnabled ? shaderConfig.fbmMix : 0
  material.uPaletteIndex = paletteIndex
}

const ensureTextureTarget = ({
  pool,
  width,
  height,
  index,
}: {
  pool: WebGLRenderTarget[]
  width: number
  height: number
  index: number
}): WebGLRenderTarget => {
  let target = pool[index]
  if (!target) {
    target = new WebGLRenderTarget(width, height)
    target.texture.colorSpace = LinearSRGBColorSpace
    target.texture.wrapS = ClampToEdgeWrapping
    target.texture.wrapT = ClampToEdgeWrapping
    pool[index] = target
  } else if (target.width !== width || target.height !== height) {
    target.setSize(width, height)
  }
  return target
}

const renderGeneratorTextures = ({
  renderer,
  generatorScene,
  generatorCamera,
  generatorMaterial,
  frameCount,
  targetSize,
  texturePool,
  seed,
  clearColor,
}: {
  renderer: WebGLRenderer
  generatorScene: Scene
  generatorCamera: OrthographicCamera
  generatorMaterial: BackgroundMaterialInstance
  frameCount: number
  targetSize: Dimensions
  texturePool: WebGLRenderTarget[]
  seed: number
  clearColor: Color
}): void => {
  const previousRenderTarget = renderer.getRenderTarget()
  const previousAutoClear = renderer.autoClear
  const previousClearAlpha = renderer.getClearAlpha()

  renderer.getClearColor(clearColor)
  renderer.autoClear = true

  let currentSeed = seed

  for (let index = 0; index < frameCount; index += 1) {
    const target = ensureTextureTarget({
      pool: texturePool,
      width: targetSize.width,
      height: targetSize.height,
      index,
    })

    renderer.setRenderTarget(target)
    renderer.setClearColor(CLEAR_COLOR_HEX, 1)
    renderer.clear(true, true, true)

    generatorMaterial.uSampleWeight = FRAME_SAMPLE_WEIGHT
    generatorMaterial.uTime = index * SAMPLE_TIME_STEP
    generatorMaterial.uSeed = currentSeed
    currentSeed += 2

    renderer.render(generatorScene, generatorCamera)
  }

  renderer.autoClear = previousAutoClear
  renderer.setClearColor(clearColor, previousClearAlpha)
  renderer.setRenderTarget(previousRenderTarget)

  generatorMaterial.uSeed = currentSeed
  generatorMaterial.uTime = 0
}

const trimTexturePool = ({
  pool,
  frameCount,
}: {
  pool: WebGLRenderTarget[]
  frameCount: number
}): void => {
  for (let index = frameCount; index < pool.length; index += 1) {
    pool[index]?.dispose()
  }
  pool.length = frameCount
}

const getTexture = (pool: WebGLRenderTarget[], index: number) => {
  return pool[index]?.texture ?? TRANSPARENT_TEXTURE
}

const primeCompositeMaterial = ({
  material,
  pool,
  shouldAnimate,
}: {
  material: CyclingBackgroundMaterialInstance
  pool: WebGLRenderTarget[]
  shouldAnimate: boolean
}): void => {
  const firstTexture = getTexture(pool, 0)

  if (!shouldAnimate || pool.length < 2) {
    material.uTextureA = firstTexture
    material.uTextureB = firstTexture
    material.uBlend = 0
    return
  }

  const nextTexture = getTexture(pool, 1)
  material.uTextureA = firstTexture
  material.uTextureB = nextTexture
  material.uBlend = 0
}

const renderCompositeToTarget = ({
  renderer,
  scene,
  camera,
  target,
}: {
  renderer: WebGLRenderer
  scene: Scene
  camera: OrthographicCamera
  target: WebGLRenderTarget
}): void => {
  const previousRenderTarget = renderer.getRenderTarget()
  renderer.setRenderTarget(target)
  renderer.render(scene, camera)
  renderer.setRenderTarget(previousRenderTarget)
}

const advanceCycleState = ({
  state,
  delta,
  segmentCount,
}: {
  state: CycleState
  delta: number
  segmentCount: number
}): void => {
  if (segmentCount === 0) {
    state.progress = 0
    return
  }

  state.progress = (state.progress + delta * state.speed) % segmentCount
}

const Background: FC = () => {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const size = useThree((state) => state.size)
  const paletteIndex = useGameStore((state) => state.paletteIndex)
  const backgroundConfig = usePerformanceStore((state) => state.sceneConfig.background)
  const { keyframes } = backgroundConfig
  const gameStore = useGameStoreAPI()

  const shouldAnimate = keyframes > 1
  const renderScale = backgroundConfig.renderScale
  const shaderConfig = useBackgroundStore((state) => state.shaderConfig)

  const sceneState = useRef(scene)
  useEffect(() => {
    sceneState.current = scene
  }, [scene])

  const rendererState = useRef(gl)
  useEffect(() => {
    rendererState.current = gl
  }, [gl])

  const clearColorBuffer = useRef(new Color())
  const initialDimensions = useRef<Dimensions | null>(null)
  if (initialDimensions.current === null) {
    initialDimensions.current = { width: size.width, height: size.height }
  }

  const resolutionVector = useRef(new Vector2(1, 1))

  const generatorSceneState = useRef<Scene | null>(null)
  const generatorCameraState = useRef<OrthographicCamera | null>(null)
  const generatorMaterialState = useRef<BackgroundMaterialInstance | null>(null)
  const generatorGeometryState = useRef<PlaneGeometry | null>(null)
  const generatorMeshState = useRef<Mesh | null>(null)

  const compositeSceneState = useRef<Scene | null>(null)
  const compositeCameraState = useRef<OrthographicCamera | null>(null)
  const compositeMaterialState = useRef<CyclingBackgroundMaterialInstance | null>(null)
  const compositeGeometryState = useRef<PlaneGeometry | null>(null)
  const compositeMeshState = useRef<Mesh | null>(null)
  const compositeRenderTargetState = useRef<WebGLRenderTarget | null>(null)

  const texturePool = useRef<WebGLRenderTarget[]>([])
  const cycleState = useRef<CycleState>({
    progress: 0,
    speed: 0,
  })
  const edgeIntensityUniform = useRef(new Vector4(0, 0, 0, 0))
  const edgeUniformDirty = useRef(true)
  const staticRenderPending = useRef(true)

  useEffect(() => {
    const generatorScene = new Scene()
    const generatorCamera = createFullscreenCamera()
    const generatorMaterial = new TextureShaderMaterial()
    const generatorGeometry = createFullscreenGeometry()
    const generatorMesh = new Mesh(generatorGeometry, generatorMaterial)
    generatorMesh.frustumCulled = false
    generatorScene.add(generatorMesh)

    generatorSceneState.current = generatorScene
    generatorCameraState.current = generatorCamera
    generatorMaterialState.current = generatorMaterial
    generatorGeometryState.current = generatorGeometry
    generatorMeshState.current = generatorMesh

    return () => {
      generatorScene.remove(generatorMesh)
      generatorGeometry.dispose()
      generatorMaterial.dispose()
      generatorScene.clear()
      generatorSceneState.current = null
      generatorCameraState.current = null
      generatorMaterialState.current = null
      generatorGeometryState.current = null
      generatorMeshState.current = null
    }
  }, [gl])

  useEffect(() => {
    const compositeScene = new Scene()
    const compositeCamera = createFullscreenCamera()
    const compositeMaterial = new CyclingBackgroundMaterial()
    const compositeGeometry = createFullscreenGeometry()
    const compositeMesh = new Mesh(compositeGeometry, compositeMaterial)
    compositeMesh.frustumCulled = false
    compositeScene.add(compositeMesh)

    const baseSize = initialDimensions.current ?? FALLBACK_DIMENSIONS
    const targetSize = computeRenderDimensions({
      baseSize,
      pixelRatio: gl.getPixelRatio(),
      renderScale,
    })

    const compositeRenderTarget = new WebGLRenderTarget(targetSize.width, targetSize.height)
    compositeRenderTarget.texture.colorSpace = LinearSRGBColorSpace
    compositeRenderTarget.texture.wrapS = ClampToEdgeWrapping
    compositeRenderTarget.texture.wrapT = ClampToEdgeWrapping

    compositeSceneState.current = compositeScene
    compositeCameraState.current = compositeCamera
    compositeMaterialState.current = compositeMaterial
    compositeGeometryState.current = compositeGeometry
    compositeMeshState.current = compositeMesh
    compositeRenderTargetState.current = compositeRenderTarget

    compositeMaterial.uEdgeIntensities.copy(edgeIntensityUniform.current)
    staticRenderPending.current = true

    if (sceneState.current) {
      sceneState.current.background = compositeRenderTarget.texture
    }

    return () => {
      if (sceneState.current) {
        sceneState.current.background = null
      }
      compositeScene.remove(compositeMesh)
      compositeGeometry.dispose()
      compositeMaterial.dispose()
      compositeRenderTarget.dispose()
      compositeScene.clear()
      compositeSceneState.current = null
      compositeCameraState.current = null
      compositeMaterialState.current = null
      compositeGeometryState.current = null
      compositeMeshState.current = null
      compositeRenderTargetState.current = null
    }
  }, [gl, scene, renderScale])

  useEffect(() => {
    const material = compositeMaterialState.current
    if (material) {
      material.uEdgeZoomStrength = shaderConfig.edgeZoomStrength
    }
  }, [shaderConfig.edgeZoomStrength])

  useEffect(() => {
    const pool = texturePool.current
    return () => {
      pool.forEach((target) => target.dispose())
      pool.length = 0
    }
  }, [])

  useEffect(() => {
    const initialValues = gameStore.getState().edgeWarningIntensities
    edgeIntensityUniform.current.set(
      initialValues.left,
      initialValues.right,
      initialValues.near,
      initialValues.far,
    )
    edgeUniformDirty.current = true
    if (!shouldAnimate) {
      staticRenderPending.current = true
    }

    const unsubscribe = gameStore.subscribe((s, prev) => {
      if (
        s.edgeWarningIntensities.left === prev.edgeWarningIntensities.left &&
        s.edgeWarningIntensities.right === prev.edgeWarningIntensities.right &&
        s.edgeWarningIntensities.near === prev.edgeWarningIntensities.near &&
        s.edgeWarningIntensities.far === prev.edgeWarningIntensities.far
      )
        return

      edgeIntensityUniform.current.set(
        s.edgeWarningIntensities.left,
        s.edgeWarningIntensities.right,
        s.edgeWarningIntensities.near,
        s.edgeWarningIntensities.far,
      )
      edgeUniformDirty.current = true
      if (!shouldAnimate) {
        staticRenderPending.current = true
      }
    })

    return unsubscribe
  }, [gameStore, shouldAnimate])

  useEffect(() => {
    const renderer = rendererState.current
    const generatorScene = generatorSceneState.current
    const generatorCamera = generatorCameraState.current
    const generatorMaterial = generatorMaterialState.current
    const compositeMaterial = compositeMaterialState.current

    if (
      !renderer ||
      !generatorScene ||
      !generatorCamera ||
      !generatorMaterial ||
      !compositeMaterial
    ) {
      return
    }

    const baseSize = initialDimensions.current ?? FALLBACK_DIMENSIONS
    const targetSize = computeRenderDimensions({
      baseSize,
      pixelRatio: renderer.getPixelRatio(),
      renderScale,
    })

    configureGeneratorMaterial({
      material: generatorMaterial,
      shaderConfig,
      paletteIndex,
      resolution: resolutionVector.current,
      baseSize,
    })

    const frameCount = shouldAnimate ? Math.min(keyframes, MAX_POOL_SIZE) : 1
    const pool = texturePool.current

    renderGeneratorTextures({
      renderer,
      generatorScene,
      generatorCamera,
      generatorMaterial,
      frameCount,
      targetSize,
      texturePool: pool,
      seed: paletteIndex + shaderConfig.seedOffset,
      clearColor: clearColorBuffer.current,
    })

    trimTexturePool({ pool, frameCount })

    primeCompositeMaterial({
      material: compositeMaterial,
      pool,
      shouldAnimate,
    })

    cycleState.current.progress = 0
    cycleState.current.speed = shouldAnimate ? frameCount * 0.05 : 0
    staticRenderPending.current = !shouldAnimate
  }, [shaderConfig, paletteIndex, keyframes, shouldAnimate, renderScale])

  useFrame((_, delta) => {
    const renderer = rendererState.current
    const compositeScene = compositeSceneState.current
    const compositeCamera = compositeCameraState.current
    const compositeMaterial = compositeMaterialState.current
    const compositeRenderTarget = compositeRenderTargetState.current
    const pool = texturePool.current

    if (
      !renderer ||
      !compositeScene ||
      !compositeCamera ||
      !compositeMaterial ||
      !compositeRenderTarget
    ) {
      return
    }

    const isStatic = !shouldAnimate || pool.length < 2

    if (edgeUniformDirty.current) {
      compositeMaterial.uEdgeIntensities.copy(edgeIntensityUniform.current)
      edgeUniformDirty.current = false
      if (isStatic) {
        staticRenderPending.current = true
      }
    }

    if (isStatic) {
      if (!staticRenderPending.current) return

      primeCompositeMaterial({
        material: compositeMaterial,
        pool,
        shouldAnimate,
      })

      renderCompositeToTarget({
        renderer,
        scene: compositeScene,
        camera: compositeCamera,
        target: compositeRenderTarget,
      })

      staticRenderPending.current = false
      return
    }

    const state = cycleState.current
    advanceCycleState({ state, delta, segmentCount: pool.length })

    const segmentIndex = Math.floor(state.progress)
    const blend = state.progress - segmentIndex
    const nextIndex = (segmentIndex + 1) % pool.length

    compositeMaterial.uTextureA = getTexture(pool, segmentIndex)
    compositeMaterial.uTextureB = getTexture(pool, nextIndex)
    compositeMaterial.uBlend = blend

    renderCompositeToTarget({
      renderer,
      scene: compositeScene,
      camera: compositeCamera,
      target: compositeRenderTarget,
    })
  })

  return null
}

export default Background
