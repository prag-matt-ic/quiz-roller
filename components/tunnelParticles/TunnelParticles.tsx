import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import React, { type FC, useLayoutEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, DataTexture, Points, Texture } from 'three'
import {
  GPUComputationRenderer,
  type Variable,
} from 'three/addons/misc/GPUComputationRenderer.js'

import { useTerrainSpeed } from '@/hooks/useTerrainSpeed'

import { Stage, useGameStore } from '../GameProvider'
import particleFragment from './points/point.frag'
import particleVertex from './points/point.vert'
import positionFragmentShader from './simulation/position.frag'
import velocityFragmentShader from './simulation/velocity.frag'

// NOTE IMPORTANT: this is not fully implemented in this project, will be updated in the future.

/**
 * TunnelParticles - GPU-computed particle system for tunnel atmosphere
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
 * 3. **Lifecycle**: Particles spawn at tunnel rear (-40 to -60z), flow toward camera, respawn when behind player
 *
 * ## Key Features:
 * - Particles spawn within tunnel radius (6.0m) using polar coordinates
 * - Velocity-based movement allows for organic flowing patterns
 * - Noise functions create natural swirling and turbulence effects
 * - Performance scales with device capability (fewer particles on mobile)
 * - Proper depth sorting and additive blending for atmospheric effect
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
  uTime: { value: number }
  uDeltaTime: { value: number }
  uTimeMultiplier: { value: number }
}

type VelocityShaderUniforms = {
  uIsIdle: { value: boolean }
  uTime: { value: number }
  uDeltaTime: { value: number }
  uTimeMultiplier: { value: number }
}

const INITIAL_POINTS_UNIFORMS: PointsShaderUniforms = {
  uTime: 0,
  uPositions: null,
  uVelocities: null,
  uDpr: 1,
}

const CustomTunnelShaderMaterial = shaderMaterial(
  INITIAL_POINTS_UNIFORMS,
  particleVertex,
  particleFragment,
)
const TunnelPointsShaderMaterial = extend(CustomTunnelShaderMaterial)

type Props = {
  isMobile: boolean
}

const TunnelParticles: FC<Props> = ({ isMobile }) => {
  const dpr = useThree((s) => s.viewport.dpr)
  const performance = useThree((s) => s.performance).current
  const renderer = useThree((s) => s.gl)

  const particlesCount = useMemo(
    () => Math.pow(isMobile ? 12 : 24 * performance, 2),
    [isMobile, performance],
  )
  const points = useRef<Points>(null)
  const pointsShaderMaterial = useRef<typeof TunnelPointsShaderMaterial & PointsShaderUniforms>(
    null,
  )
  const textureSize = useMemo(() => Math.sqrt(particlesCount), [particlesCount])

  // GPUComputationRenderer setup
  const gpuCompute = useRef<GPUComputationRenderer | null>(null)
  const positionVariable = useRef<Variable>(null)
  const velocityVariable = useRef<Variable>(null)
  const positionUniforms = useRef<PositionShaderUniforms | null>(null)
  const velocityUniforms = useRef<VelocityShaderUniforms | null>(null)

  const isPlaying = useGameStore((s) => s.stage !== Stage.INTRO)
  const { terrainSpeed } = useTerrainSpeed()
  const lastTime = useRef(0)

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
  useLayoutEffect(() => {
    if (!renderer) return

    try {
      gpuCompute.current = new GPUComputationRenderer(textureSize, textureSize, renderer)

      // Create initial textures
      const dtPosition = gpuCompute.current.createTexture()
      const dtVelocity = gpuCompute.current.createTexture()
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
        positionUniforms.current.uTime = { value: 0.0 }
        positionUniforms.current.uDeltaTime = { value: 0.016 }
        positionUniforms.current.uTimeMultiplier = { value: 1.0 }
      }

      // Set velocity uniforms
      velocityUniforms.current = velocityVariable.current.material
        .uniforms as VelocityShaderUniforms
      if (velocityUniforms.current) {
        velocityUniforms.current.uIsIdle = { value: true }
        velocityUniforms.current.uTime = { value: 0.0 }
        velocityUniforms.current.uDeltaTime = { value: 0.016 }
        velocityUniforms.current.uTimeMultiplier = { value: 1.0 }
      }

      // Initialize GPU compute
      const error = gpuCompute.current.init()
      if (error !== null) throw new Error(error)
    } catch (error) {
      console.error('Error initializing TunnelParticles GPUComputationRenderer:', error)
    }
  }, [renderer, textureSize, seeds])

  useFrame(() => {
    if (
      !pointsShaderMaterial.current ||
      !gpuCompute.current ||
      !positionUniforms.current ||
      !velocityUniforms.current ||
      !positionVariable.current ||
      !velocityVariable.current
    )
      return

    const time = gameTime.current
    const deltaTime = time - lastTime.current
    lastTime.current = time

    // Update position uniforms
    positionUniforms.current.uIsIdle.value = !isPlaying
    positionUniforms.current.uTime.value = time
    positionUniforms.current.uDeltaTime.value = Math.min(deltaTime, 0.033) // Cap at ~30fps
    positionUniforms.current.uTimeMultiplier.value = timeMultiplier.current

    // Update velocity uniforms
    velocityUniforms.current.uIsIdle.value = !isPlaying
    velocityUniforms.current.uTime.value = time
    velocityUniforms.current.uDeltaTime.value = Math.min(deltaTime, 0.033)
    velocityUniforms.current.uTimeMultiplier.value = timeMultiplier.current

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
    <points ref={points} dispose={null} frustumCulled={false} renderOrder={-1}>
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

      <TunnelPointsShaderMaterial
        key={CustomTunnelShaderMaterial.key}
        ref={pointsShaderMaterial}
        {...INITIAL_POINTS_UNIFORMS}
        transparent={true}
        depthTest={false}
        blending={AdditiveBlending}
        uDpr={dpr}
      />
    </points>
  )
}

export default TunnelParticles

// Helper function to fill position texture with initial particle data
const fillPositionTexture = (texturePosition: DataTexture) => {
  const posArray = texturePosition.image.data as Float32Array

  for (let k = 0, kl = posArray.length; k < kl; k += 4) {
    // Random position within tunnel radius (6.4 meters)
    const angle = Math.random() * Math.PI * 2
    const radius = Math.random() * 6.0 // Slightly smaller than tunnel radius for safety
    const x = Math.cos(angle) * radius
    const y = Math.sin(angle) * radius
    const z = -40 - Math.random() * 20 // Start around spawn zone with some variation

    // Position (xyz) and life (w)
    posArray[k + 0] = x
    posArray[k + 1] = y
    posArray[k + 2] = z
    posArray[k + 3] = Math.random() // Random initial life
  }

  texturePosition.needsUpdate = true
}

// Helper function to fill velocity texture with initial particle data
const fillVelocityTexture = (textureVelocity: DataTexture) => {
  const velArray = textureVelocity.image.data as Float32Array

  for (let k = 0, kl = velArray.length; k < kl; k += 4) {
    // Initial velocity - primarily towards camera with some variation
    const vx = (Math.random() - 0.5) * 4.0 // Small X variation
    const vy = (Math.random() - 0.5) * 4.0 // Small Y variation
    const vz = 15.0 + Math.random() * 10.0 // Base speed towards camera with variation

    // Velocity (xyz) and unused (w)
    velArray[k + 0] = vx
    velArray[k + 1] = vy
    velArray[k + 2] = vz
    velArray[k + 3] = 1.0 // Unused
  }

  textureVelocity.needsUpdate = true
}
