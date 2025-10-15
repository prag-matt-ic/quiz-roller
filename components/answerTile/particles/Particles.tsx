import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { type FC, useEffect, useMemo, useRef } from 'react'
import { DataTexture, Matrix3, Matrix4, Points, Texture, Vector3 } from 'three'
import {
  GPUComputationRenderer,
  type Variable,
} from 'three/addons/misc/GPUComputationRenderer.js'

import { usePlayerPosition } from '@/hooks/usePlayerPosition'

import { Stage, useGameStore } from '../../GameProvider'
import particleFragment from './points/point.frag'
import particleVertex from './points/point.vert'
import positionFragmentShader from './simulation/position.frag'
import velocityFragmentShader from './simulation/velocity.frag'

/**
 * Confetti Particles - GPU-computed particle burst for AnswerTile
 *
 * This component creates flowing particles that move through the tunnel using a dual-texture
 * GPU computation approach for high performance and organic movement.
 *
 * ## Architecture:
 * - **Position Texture (RGBA)**: Stores particle position (xyz) + life (w)
 * - **Velocity Texture (RGBA)**: Stores particle velocity (xyz) + unused (w)
 * - **GPU Computation**: Two fragment shaders run each frame to update both textures
 * - **Points Rendering**: Instanced points system reads from computed textures
 *
 * ## Simulation Flow:
 * 1. **Velocity Shader**: Updates particle velocities with noise-based forces, damping, and momentum
 * 2. **Position Shader**: Updates particle positions using velocity data for smooth movement
 * 3. **Lifecycle**: Particles remain idle and invisible until triggered, then burst upward and fade out
 *
 * ## Key Features:
 * - Burst emits from the local AnswerTile plane surface (y=spawnY)
 * - Upward velocity with lateral randomness and gravity
 * - Fade-in/out via life parameter; no respawn after burst
 * - Small fixed particle count (64) for a crisp, celebratory effect
 *
 * ## Performance:
 * - Mobile: 24² = 576 particles
 * - Desktop: 32² × performance = ~1024-4096 particles
 * - Minimal CPU overhead - all simulation runs on GPU
 */

type PointsShaderUniforms = {
  uTime: number
  uPositions: Texture | null
  uVelocities: Texture | null
  uDpr: number
}

type PositionShaderUniforms = {
  uIsIdle: { value: boolean }
  uSpawnBurst: { value: boolean }
  uTime: { value: number }
  uDeltaTime: { value: number }
  uTileWidth: { value: number }
  uTileHeight: { value: number }
  uSpawnY: { value: number }
  uParentDeltaLocal: { value: Vector3 }
}

type VelocityShaderUniforms = {
  uIsIdle: { value: boolean }
  uSpawnBurst: { value: boolean }
  uTime: { value: number }
  uDeltaTime: { value: number }
  uPlayerPos: { value: Vector3 }
}

const INITIAL_POINTS_UNIFORMS: PointsShaderUniforms = {
  uTime: 0,
  uPositions: null,
  uVelocities: null,
  uDpr: 1,
}

const CustomPointsShaderMaterial = shaderMaterial(
  INITIAL_POINTS_UNIFORMS,
  particleVertex,
  particleFragment,
)
const PointsShaderMaterial = extend(CustomPointsShaderMaterial)

type Props = {
  // Confetti plane size (AnswerTile width/height)
  width: number
  height: number
  // Trigger the burst once when this flips from false -> true
  active: boolean
  // Optional local spawn height (y). Defaults to 0 (tile surface)
  spawnY?: number
}

const Particles: FC<Props> = ({ width, height, active, spawnY = 0 }) => {
  const dpr = useThree((s) => s.viewport.dpr)
  const performance = useThree((s) => s.performance).current
  const renderer = useThree((s) => s.gl)

  // Fixed 64-particle burst (8x8 texture)
  const particlesCount = 64
  const points = useRef<Points>(null)
  const pointsShaderMaterial = useRef<typeof PointsShaderMaterial & PointsShaderUniforms>(null)
  const textureSize = useMemo(() => Math.sqrt(particlesCount), [particlesCount])

  // GPUComputationRenderer setup
  const gpuCompute = useRef<GPUComputationRenderer | null>(null)
  const positionVariable = useRef<Variable>(null)
  const velocityVariable = useRef<Variable>(null)
  const positionUniforms = useRef<PositionShaderUniforms | null>(null)
  const velocityUniforms = useRef<VelocityShaderUniforms | null>(null)

  const isPlaying = useGameStore((s) => s.stage !== Stage.SPLASH)
  const accumTime = useRef(0)
  const hasBurst = useRef(false)
  const lastActive = useRef(false)
  // Player position transforms
  const worldPlayer = useRef(new Vector3())
  const localPlayer = useRef(new Vector3())
  const invWorld = useRef(new Matrix4())
  const invRot = useRef(new Matrix3())
  const prevWorld = useRef(new Vector3())
  const currWorld = useRef(new Vector3())
  const deltaWorld = useRef(new Vector3())
  const deltaLocal = useRef(new Vector3())
  usePlayerPosition((p) => {
    worldPlayer.current.set(p.x, p.y, p.z)
  })

  // ------------------
  // PARTICLE GEOMETRY SETUP
  // ------------------
  const particlesPositions = useMemo(() => {
    return new Float32Array(particlesCount * 3).fill(0)
  }, [particlesCount])

  const { seeds, textureUvs } = useMemo(() => {
    // Allocate single buffer: 1 seed + 2 UVs = 3 floats per particle
    const totalFloats = particlesCount * 3
    const singleBuffer = new Float32Array(totalFloats)

    // Create views into the buffer
    const seeds = singleBuffer.subarray(0, particlesCount)
    const textureUvs = singleBuffer.subarray(particlesCount, particlesCount * 3)

    for (let i = 0; i < particlesCount; i++) {
      // Seed
      seeds[i] = Math.random()

      // UV coordinates for texture sampling
      const x = (i % textureSize) / (textureSize - 1)
      const y = Math.floor(i / textureSize) / (textureSize - 1)
      textureUvs[i * 2] = x
      textureUvs[i * 2 + 1] = y
    }

    return { seeds, textureUvs }
  }, [particlesCount, textureSize])

  // ------------------
  // SIMULATION SETUP
  // ------------------
  useEffect(() => {
    if (!renderer) return

    try {
      gpuCompute.current = new GPUComputationRenderer(textureSize, textureSize, renderer)

      // Create initial textures
      const dtPosition = gpuCompute.current.createTexture()
      const dtVelocity = gpuCompute.current.createTexture()
      // Initialize all particles as idle/invisible (life=0, zero velocity)
      fillPositionTexture(dtPosition)
      fillVelocityTexture(dtVelocity)

      // Add variables to GPU compute
      positionVariable.current = gpuCompute.current.addVariable(
        'texturePosition',
        positionFragmentShader,
        dtPosition,
      )
      velocityVariable.current = gpuCompute.current.addVariable(
        'textureVelocity',
        velocityFragmentShader,
        dtVelocity,
      )

      // Set dependencies
      gpuCompute.current.setVariableDependencies(positionVariable.current, [
        positionVariable.current,
        velocityVariable.current,
      ])
      gpuCompute.current.setVariableDependencies(velocityVariable.current, [
        positionVariable.current,
        velocityVariable.current,
      ])

      // Set uniforms
      positionUniforms.current = positionVariable.current.material
        .uniforms as PositionShaderUniforms
      if (positionUniforms.current) {
        positionUniforms.current.uIsIdle = { value: true }
        positionUniforms.current.uSpawnBurst = { value: false }
        positionUniforms.current.uTime = { value: 0.0 }
        positionUniforms.current.uDeltaTime = { value: 0.016 }
        positionUniforms.current.uTileWidth = { value: width }
        positionUniforms.current.uTileHeight = { value: height }
        positionUniforms.current.uSpawnY = { value: spawnY }
        positionUniforms.current.uParentDeltaLocal = { value: deltaLocal.current }
      }

      // Set velocity uniforms
      velocityUniforms.current = velocityVariable.current.material
        .uniforms as VelocityShaderUniforms
      if (velocityUniforms.current) {
        velocityUniforms.current.uIsIdle = { value: true }
        velocityUniforms.current.uSpawnBurst = { value: false }
        velocityUniforms.current.uTime = { value: 0.0 }
        velocityUniforms.current.uDeltaTime = { value: 0.016 }
        velocityUniforms.current.uPlayerPos = { value: localPlayer.current }
      }

      // Initialize GPU compute
      const error = gpuCompute.current.init()
      if (error !== null) throw new Error(error)
    } catch (error) {
      console.error('Error initializing TunnelParticles GPUComputationRenderer:', error)
    }
  }, [renderer, textureSize, seeds, width, height, spawnY])

  useFrame((_, delta) => {
    if (
      !pointsShaderMaterial.current ||
      !gpuCompute.current ||
      !positionUniforms.current ||
      !velocityUniforms.current ||
      !positionVariable.current ||
      !velocityVariable.current
    )
      return

    accumTime.current += delta
    const time = accumTime.current

    // Detect rising edge to trigger one-frame spawn
    const justActivated = active && !lastActive.current && !hasBurst.current
    lastActive.current = active
    if (justActivated) hasBurst.current = true

    // On first frame, initialize previous world position for delta compute
    if (points.current && accumTime.current === delta) {
      points.current.getWorldPosition(prevWorld.current)
    }

    // Update position uniforms
    positionUniforms.current.uIsIdle.value = !isPlaying || !active
    positionUniforms.current.uSpawnBurst.value = justActivated
    positionUniforms.current.uTime.value = time
    positionUniforms.current.uDeltaTime.value = delta
    positionUniforms.current.uTileWidth.value = width
    positionUniforms.current.uTileHeight.value = height
    positionUniforms.current.uSpawnY.value = spawnY
    // Parent world delta -> emitter local delta compensation
    if (points.current) {
      // sample current world position of points origin
      points.current.getWorldPosition(currWorld.current)
      // compute delta in world
      deltaWorld.current.copy(currWorld.current).sub(prevWorld.current)
      prevWorld.current.copy(currWorld.current)
      // compute inverse rotation
      invWorld.current.copy(points.current.matrixWorld).invert()
      invRot.current.setFromMatrix4(invWorld.current)
      // transform delta into local (ignore translation)
      deltaLocal.current.copy(deltaWorld.current).applyMatrix3(invRot.current)
    }

    // Update velocity uniforms
    velocityUniforms.current.uIsIdle.value = !isPlaying || !active
    velocityUniforms.current.uSpawnBurst.value = justActivated
    velocityUniforms.current.uTime.value = time
    velocityUniforms.current.uDeltaTime.value = delta
    // Transform player world position into this emitter's local space
    if (points.current) {
      invWorld.current.copy(points.current.matrixWorld).invert()
      localPlayer.current.copy(worldPlayer.current).applyMatrix4(invWorld.current)
    }

    // Compute the simulation
    gpuCompute.current.compute()

    // Set the result textures to the points material
    pointsShaderMaterial.current.uTime = time
    pointsShaderMaterial.current.uPositions = gpuCompute.current.getCurrentRenderTarget(
      positionVariable.current,
    ).texture
    pointsShaderMaterial.current.uVelocities = gpuCompute.current.getCurrentRenderTarget(
      velocityVariable.current,
    ).texture
  })

  return (
    <points
      ref={points}
      dispose={null}
      frustumCulled={false}
      // Cancel parent -PI/2 rotation from AnswerTile so Y = world up
      rotation={[Math.PI / 2, 0, 0]}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          args={[particlesPositions, 3]}
          count={particlesPositions.length / 3}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-uv"
          args={[textureUvs, 2]}
          count={textureUvs.length / 2}
        />
        <bufferAttribute attach="attributes-seed" args={[seeds, 1]} count={seeds.length} />
      </bufferGeometry>

      <PointsShaderMaterial
        key={CustomPointsShaderMaterial.key}
        ref={pointsShaderMaterial}
        {...INITIAL_POINTS_UNIFORMS}
        transparent={true}
        depthTest={false}
        uDpr={dpr}
      />
    </points>
  )
}

export default Particles

// Helper function to fill position texture with initial particle data
const fillPositionTexture = (texturePosition: DataTexture) => {
  const posArray = texturePosition.image.data as Float32Array

  for (let k = 0, kl = posArray.length; k < kl; k += 4) {
    // Idle state: all particles invisible with zero life
    posArray[k + 0] = 0
    posArray[k + 1] = 0
    posArray[k + 2] = 0
    posArray[k + 3] = 0 // life=0 -> fully invisible until burst
  }

  texturePosition.needsUpdate = true
}

// Helper function to fill velocity texture with initial particle data
const fillVelocityTexture = (textureVelocity: DataTexture) => {
  const velArray = textureVelocity.image.data as Float32Array

  for (let k = 0, kl = velArray.length; k < kl; k += 4) {
    // Idle state: zero velocity
    velArray[k + 0] = 0
    velArray[k + 1] = 0
    velArray[k + 2] = 0
    velArray[k + 3] = 0
  }

  textureVelocity.needsUpdate = true
}
