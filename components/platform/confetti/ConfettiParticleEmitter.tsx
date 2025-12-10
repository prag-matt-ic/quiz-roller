'use client'

import { shaderMaterial } from '@react-three/drei'
import { extend, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, Color, type Vector3Tuple } from 'three'

import { usePerformanceStore } from '@/components/PerformanceProvider'
import useGameFrame from '@/hooks/useGameFrame'
import {
  CONFETTI_PARTICLE_COLOURS_GOLD,
  CONFETTI_PARTICLE_COLOURS_GREEN,
  CONFETTI_PARTICLE_COLOURS_TEAL,
} from '@/resources/colours'

import fragmentShader from './particles/confettiPoint.frag'
import vertexShader from './particles/confettiPoint.vert'

type PointsShaderUniforms = {
  uBurstProgress: number
  uTime: number
  uDpr: number
  uGravity: number
  uBurstDuration: number
}

const INITIAL_POINTS_UNIFORMS: PointsShaderUniforms = {
  uBurstProgress: 0,
  uTime: 0,
  uDpr: 1,
  uGravity: -6,
  uBurstDuration: 1.8,
}

const ConfettiPointsShader = shaderMaterial(
  INITIAL_POINTS_UNIFORMS,
  vertexShader,
  fragmentShader,
)
const ConfettiPointsShaderMaterial = extend(ConfettiPointsShader)

export type ConfettiParticleEmitterHandle = {
  burst: () => void
  reset: () => void
}

const CONFETTI_PALETTES = [
  CONFETTI_PARTICLE_COLOURS_GOLD,
  CONFETTI_PARTICLE_COLOURS_TEAL,
  CONFETTI_PARTICLE_COLOURS_GREEN,
] as const

type Props = {
  position: Vector3Tuple
  isVisible: boolean
  confettiIndex: number
  seedOffset?: number
}

const tmpColor = new Color()
const CONFETTI_GRAVITY = -6
const BURST_DURATION_SECONDS = 1.6
const MIN_DRIFT_SPEED = 0.45
const MAX_DRIFT_SPEED = 2.0
const MIN_LAUNCH_SPEED = 5.0
const MAX_LAUNCH_SPEED = 10.0
const MIN_PARTICLE_SIZE = 12.0
const MAX_PARTICLE_SIZE = 31.5

const createRandomSeeds = (count: number, offset: number): Float32Array => {
  const values = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    values[i] = Math.random() + offset * 0.01
  }
  return values
}

const createRandomColours = (count: number, palette: readonly string[]): Float32Array => {
  const values = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const colourIndex = Math.floor(Math.random() * palette.length)
    tmpColor.set(palette[colourIndex])
    const offset = i * 3
    values[offset] = tmpColor.r
    values[offset + 1] = tmpColor.g
    values[offset + 2] = tmpColor.b
  }
  return values
}

const getPaletteForIndex = (index: number): readonly string[] => {
  const paletteIndex = Math.abs(index) % CONFETTI_PALETTES.length
  const palette = CONFETTI_PALETTES[paletteIndex]
  if (!palette || palette.length === 0) return CONFETTI_PALETTES[0]
  return palette
}

const createSpawnPositions = (count: number): Float32Array => {
  const positions = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const offset = i * 3
    positions[offset] = (Math.random() - 0.5) * 0.8
    positions[offset + 1] = 0
    positions[offset + 2] = (Math.random() - 0.5) * 0.8
  }
  return positions
}

const createDriftVelocities = (count: number): Float32Array => {
  const drift = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const offset = i * 3
    const theta = Math.random() * Math.PI * 2
    const speed = MIN_DRIFT_SPEED + Math.random() * (MAX_DRIFT_SPEED - MIN_DRIFT_SPEED)
    drift[offset] = Math.cos(theta) * speed
    drift[offset + 1] = 0
    drift[offset + 2] = Math.sin(theta) * speed
  }
  return drift
}

const createLaunchSpeeds = (count: number): Float32Array => {
  const launchSpeeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    launchSpeeds[i] = MIN_LAUNCH_SPEED + Math.random() * (MAX_LAUNCH_SPEED - MIN_LAUNCH_SPEED)
  }
  return launchSpeeds
}

const ConfettiParticleEmitter = forwardRef<ConfettiParticleEmitterHandle, Props>(
  ({ position, isVisible, confettiIndex, seedOffset = 0 }, ref) => {
    const particleCount = usePerformanceStore((s) => s.sceneConfig.gem.particleCount)
    const useDistanceFade = usePerformanceStore((s) => s.sceneConfig.isDistanceFadeEnabled)
    const dpr = useThree((s) => s.viewport.dpr)

    const materialRef = useRef<
      (typeof ConfettiPointsShaderMaterial & PointsShaderUniforms) | null
    >(null)

    const progress = useRef({ value: 0 })
    const progressTween = useRef<gsap.core.Tween | null>(null)

    const palette = useMemo(() => getPaletteForIndex(confettiIndex), [confettiIndex])
    const seeds = useMemo(
      () => createRandomSeeds(particleCount, seedOffset),
      [particleCount, seedOffset],
    )
    const colours = useMemo(
      () => createRandomColours(particleCount, palette),
      [particleCount, palette],
    )
    const spawnPositions = useMemo(() => createSpawnPositions(particleCount), [particleCount])
    const initialPositions = useMemo(() => new Float32Array(particleCount * 3), [particleCount])
    const driftVelocities = useMemo(() => createDriftVelocities(particleCount), [particleCount])
    const launchSpeeds = useMemo(() => createLaunchSpeeds(particleCount), [particleCount])

    const seedAttribute = useRef<BufferAttribute>(null)
    const colourAttribute = useRef<BufferAttribute>(null)
    const spawnAttribute = useRef<BufferAttribute>(null)
    const driftAttribute = useRef<BufferAttribute>(null)
    const launchSpeedAttribute = useRef<BufferAttribute>(null)

    useEffect(() => {
      if (seedAttribute.current) seedAttribute.current.needsUpdate = true
    }, [seeds])

    useEffect(() => {
      if (colourAttribute.current) colourAttribute.current.needsUpdate = true
    }, [colours])

    useEffect(() => {
      if (spawnAttribute.current) spawnAttribute.current.needsUpdate = true
    }, [spawnPositions])

    useEffect(() => {
      if (driftAttribute.current) driftAttribute.current.needsUpdate = true
    }, [driftVelocities])

    useEffect(() => {
      if (launchSpeedAttribute.current) launchSpeedAttribute.current.needsUpdate = true
    }, [launchSpeeds])

    const burst = useCallback(() => {
      const material = materialRef.current
      if (!material) return
      progressTween.current?.kill()
      progress.current.value = 0
      material.uBurstProgress = 0
      progressTween.current = gsap.to(progress.current, {
        value: 1,
        duration: 1.8,
        ease: 'power2.out',
        onUpdate: () => {
          material.uBurstProgress = progress.current.value
        },
      })
    }, [])

    const reset = useCallback(() => {
      const material = materialRef.current
      progressTween.current?.kill()
      progress.current.value = 0
      if (material) {
        material.uBurstProgress = 0
      }
    }, [])

    useImperativeHandle(
      ref,
      () => ({
        burst,
        reset,
      }),
      [burst, reset],
    )

    useEffect(() => {
      return () => {
        progressTween.current?.kill()
      }
    }, [])

    useGameFrame(({ clock }) => {
      const material = materialRef.current
      if (!material) return
      if (!isVisible) return
      material.uBurstProgress = progress.current.value
      material.uTime = clock.elapsedTime
    })

    return (
      <points position={position} dispose={null} frustumCulled={false} visible={isVisible}>
        <bufferGeometry attach="geometry">
          <bufferAttribute
            attach="attributes-position"
            args={[initialPositions, 3]}
            count={initialPositions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            ref={spawnAttribute}
            attach="attributes-spawnPosition"
            args={[spawnPositions, 3]}
            count={spawnPositions.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            ref={driftAttribute}
            attach="attributes-driftVelocity"
            args={[driftVelocities, 3]}
            count={driftVelocities.length / 3}
            itemSize={3}
          />
          <bufferAttribute
            ref={seedAttribute}
            attach="attributes-seed"
            args={[seeds, 1]}
            count={seeds.length}
            itemSize={1}
          />
          <bufferAttribute
            ref={launchSpeedAttribute}
            attach="attributes-launchSpeed"
            args={[launchSpeeds, 1]}
            count={launchSpeeds.length}
            itemSize={1}
          />
          <bufferAttribute
            ref={colourAttribute}
            attach="attributes-colour"
            args={[colours, 3]}
            count={colours.length / 3}
            itemSize={3}
          />
        </bufferGeometry>

        <ConfettiPointsShaderMaterial
          key={ConfettiPointsShader.key}
          ref={materialRef}
          transparent={true}
          depthTest={false}
          blending={AdditiveBlending}
          {...INITIAL_POINTS_UNIFORMS}
          uDpr={dpr}
          uGravity={CONFETTI_GRAVITY}
          uBurstDuration={BURST_DURATION_SECONDS}
          defines={{ USE_DISTANCE_FADE: useDistanceFade ? 1 : 0 }}
        />
      </points>
    )
  },
)

ConfettiParticleEmitter.displayName = 'ConfettiParticleEmitter'

export default ConfettiParticleEmitter
