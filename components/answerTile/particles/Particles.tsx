import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { type FC, useCallback, useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, Points, Vector3 } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'

import particleFragment from './point.frag'
import particleVertex from './point.vert'

type PointsShaderUniforms = {
  uBurstProgress: number
  uPlayerPosition: Vector3
  uDpr: number
  uShouldAttract: number
}

const INITIAL_POINTS_UNIFORMS: PointsShaderUniforms = {
  uBurstProgress: 0,
  uPlayerPosition: new Vector3(),
  uDpr: 1,
  uShouldAttract: 0,
}

const CustomPointsShaderMaterial = shaderMaterial(
  INITIAL_POINTS_UNIFORMS,
  particleVertex,
  particleFragment,
)
const PointsShaderMaterial = extend(CustomPointsShaderMaterial)

type Props = {
  width: number
  height: number
  wasConfirmed: boolean
  shouldAttract: boolean
}

const Particles: FC<Props> = ({
  width,
  height,
  wasConfirmed = false,
  shouldAttract = false,
}) => {
  const particleCount = usePerformanceStore((s) => s.sceneConfig.answerTile.particleCount)
  const dpr = useThree((s) => s.viewport.dpr)
  const goToStage = useGameStore((s) => s.goToStage)

  const points = useRef<Points>(null)
  const materialRef = useRef<(typeof PointsShaderMaterial & PointsShaderUniforms) | null>(null)

  const progress = useRef({ value: 0 })
  const progressTween = useRef<GSAPTween | null>(null)
  const isActive = useRef(false)

  const playerLocalPosition = useRef(new Vector3())
  const { playerPosition } = usePlayerPosition()

  // Geometry buffers
  const initialPositions = useMemo(() => new Float32Array(particleCount * 3), [particleCount])
  const spawnPositions = useMemo(() => new Float32Array(particleCount * 3), [particleCount])
  const seeds = useMemo(() => new Float32Array(particleCount), [particleCount])

  const spawnAttribute = useRef<BufferAttribute>(null)
  const seedAttribute = useRef<BufferAttribute>(null)

  const refreshSeeds = useCallback(() => {
    if (!seedAttribute.current) {
      console.error('Seed attribute not initialized')
      return
    }
    for (let i = 0; i < particleCount; i++) {
      seeds[i] = Math.random()
    }
    seedAttribute.current.needsUpdate = true
  }, [particleCount, seeds])

  useEffect(() => {
    const initializeStaticParticleData = () => {
      for (let i = 0; i < particleCount; i++) {
        const spawnIndex = i * 3
        // Spawn within tile footprint (local space)
        spawnPositions[spawnIndex] = (Math.random() - 0.5) * width
        spawnPositions[spawnIndex + 1] = 0
        spawnPositions[spawnIndex + 2] = (Math.random() - 0.5) * height
      }
      if (spawnAttribute.current) {
        spawnAttribute.current.needsUpdate = true
      }
    }
    initializeStaticParticleData()
  }, [height, particleCount, spawnPositions, width])

  useEffect(() => {
    refreshSeeds()
  }, [refreshSeeds])

  useEffect(() => {
    if (!wasConfirmed || !materialRef.current) return

    progressTween.current?.kill()
    progress.current.value = 0
    isActive.current = true

    refreshSeeds()

    materialRef.current.uBurstProgress = 0
    materialRef.current.uShouldAttract = shouldAttract ? 1 : 0

    progressTween.current = gsap.to(progress.current, {
      value: 1,
      duration: 1.3,
      ease: 'power2.out',
      onComplete: () => {
        materialRef.current!.uBurstProgress = 0
        isActive.current = false
        goToStage(Stage.TERRAIN)
      },
    })
  }, [goToStage, refreshSeeds, wasConfirmed, shouldAttract])

  useEffect(() => {
    return () => {
      progressTween.current?.kill()
      isActive.current = false
    }
  }, [])

  useFrame(() => {
    if (!materialRef.current || !points.current || !isActive.current) return

    // Update burst progress uniform
    materialRef.current.uBurstProgress = progress.current.value

    // Update player position in local particle space
    points.current.worldToLocal(playerLocalPosition.current.copy(playerPosition.current))
    materialRef.current.uPlayerPosition.copy(playerLocalPosition.current)
  })

  return (
    <points ref={points} dispose={null} frustumCulled={false} rotation={[Math.PI / 2, 0, 0]}>
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
          ref={seedAttribute}
          attach="attributes-seed"
          args={[seeds, 1]}
          count={seeds.length}
          itemSize={1}
        />
      </bufferGeometry>

      <PointsShaderMaterial
        key={CustomPointsShaderMaterial.key}
        ref={materialRef}
        {...INITIAL_POINTS_UNIFORMS}
        uDpr={dpr}
        transparent={true}
        depthTest={false}
      />
    </points>
  )
}

export default Particles
