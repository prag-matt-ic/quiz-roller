import { shaderMaterial } from '@react-three/drei'
import { extend, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { type FC, useEffect, useMemo, useRef } from 'react'
import { AdditiveBlending, BufferAttribute, Color, Vector3, type Vector3Tuple } from 'three'

import { usePerformanceStore } from '@/components/PerformanceProvider'
import particleFragment from './point.frag'
import particleVertex from './point.vert'
import useGameFrame from '@/hooks/useGameFrame'
import { CollectibleID } from '@/model/schema'
import { GEMS_BY_ID, GOLD_PARTICLE_PALETTE } from '@/resources/content'

type PointsShaderUniforms = {
  uBurstProgress: number
  uGemPosition: Vector3
  uGemScale: number
  uTime: number
  uDpr: number
}

const INITIAL_POINTS_UNIFORMS: PointsShaderUniforms = {
  uBurstProgress: 0,
  uGemPosition: new Vector3(),
  uGemScale: 1,
  uTime: 0,
  uDpr: 1,
}

const CustomPointsShaderMaterial = shaderMaterial(
  INITIAL_POINTS_UNIFORMS,
  particleVertex,
  particleFragment,
)
const PointsShaderMaterial = extend(CustomPointsShaderMaterial)

type Props = {
  id: CollectibleID
  tileWidth: number
  tileHeight: number
  wasConfirmed: boolean
  gemPosition: Vector3Tuple
  gemScale: number
  position?: Vector3Tuple
  isVisible: boolean
}

const EPSILON = 0.0001

const createRandomSeeds = (count: number): Float32Array => {
  const values = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    values[i] = Math.random()
  }
  return values
}

const tempColour = new Color()

const createRandomColours = (count: number, palette: readonly string[]): Float32Array => {
  const values = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const offset = i * 3
    const colourIndex = Math.floor(Math.random() * palette.length)
    tempColour.set(palette[colourIndex])
    values[offset] = tempColour.r
    values[offset + 1] = tempColour.g
    values[offset + 2] = tempColour.b
  }
  return values
}

const sampleOctaPoint = () => {
  const signedRand = {
    x: Math.random() * 2 - 1,
    y: Math.random() * 2 - 1,
    z: Math.random() * 2 - 1,
  }
  const normalization =
    Math.abs(signedRand.x) + Math.abs(signedRand.y) + Math.abs(signedRand.z) || EPSILON
  const radius = Math.pow(Math.random(), 0.55)
  return {
    x: (signedRand.x / normalization) * radius,
    y: (signedRand.y / normalization) * radius,
    z: (signedRand.z / normalization) * radius,
  }
}

const Particles: FC<Props> = ({
  id,
  tileWidth,
  tileHeight,
  wasConfirmed = false,
  gemPosition,
  gemScale,
  position = [0, 0, 0],
  isVisible,
}) => {
  const particleCount = usePerformanceStore((s) => s.sceneConfig.gem.particleCount)
  const useDistanceFade = usePerformanceStore((s) => s.sceneConfig.useDistanceFade)
  const dpr = useThree((s) => s.viewport.dpr)
  const materialRef = useRef<(typeof PointsShaderMaterial & PointsShaderUniforms) | null>(null)

  const progress = useRef({ value: 0 })
  const progressTween = useRef<GSAPTween | null>(null)
  const hasMounted = useRef(false)
  const previouslyConfirmed = useRef(false)

  const [gemX, gemY, gemZ] = gemPosition
  const gemParentPosition = useMemo(() => new Vector3(gemX, gemY, gemZ), [gemX, gemY, gemZ])
  // Geometry buffers
  const positionComponentCount = particleCount * 3
  const initialPositions = useMemo(
    () => new Float32Array(positionComponentCount),
    [positionComponentCount],
  )
  const spawnPositions = useMemo(
    () => new Float32Array(positionComponentCount),
    [positionComponentCount],
  )
  const gemTargets = useMemo(
    () => new Float32Array(positionComponentCount),
    [positionComponentCount],
  )
  const seeds = useMemo(() => createRandomSeeds(particleCount), [particleCount])
  const particlePalette = GEMS_BY_ID[id]?.particlesPalette ?? GOLD_PARTICLE_PALETTE
  const colours = useMemo(
    () => createRandomColours(particleCount, particlePalette),
    [particleCount, particlePalette],
  )

  const spawnAttribute = useRef<BufferAttribute>(null)
  const gemTargetAttribute = useRef<BufferAttribute>(null)
  const seedAttribute = useRef<BufferAttribute>(null)
  const colourAttribute = useRef<BufferAttribute>(null)

  useEffect(() => {
    const initializeStaticParticleData = () => {
      /* eslint-disable react-hooks/immutability */
      for (let i = 0; i < particleCount; i++) {
        const spawnIndex = i * 3
        // Spawn within tile footprint (local space)
        spawnPositions[spawnIndex] = (Math.random() - 0.5) * tileWidth
        spawnPositions[spawnIndex + 1] = 0
        spawnPositions[spawnIndex + 2] = (Math.random() - 0.5) * tileHeight

        const target = sampleOctaPoint()
        gemTargets[spawnIndex] = target.x
        gemTargets[spawnIndex + 1] = target.y
        gemTargets[spawnIndex + 2] = target.z
      }
      /* eslint-enable react-hooks/immutability */
      if (spawnAttribute.current) {
        spawnAttribute.current.needsUpdate = true
      }
      if (gemTargetAttribute.current) {
        gemTargetAttribute.current.needsUpdate = true
      }
    }
    initializeStaticParticleData()
  }, [gemTargets, particleCount, spawnPositions, tileHeight, tileWidth])

  useEffect(() => {
    if (seedAttribute.current) {
      seedAttribute.current.needsUpdate = true
    }
  }, [seeds])

  useEffect(() => {
    if (colourAttribute.current) {
      colourAttribute.current.needsUpdate = true
    }
  }, [colours])

  useEffect(() => {
    const material = materialRef.current
    if (!hasMounted.current || !material) {
      hasMounted.current = true
      previouslyConfirmed.current = wasConfirmed
      progress.current.value = wasConfirmed ? 1 : 0
      if (material) {
        material.uBurstProgress = progress.current.value
      }
      return
    }

    const justConfirmed = wasConfirmed && !previouslyConfirmed.current
    previouslyConfirmed.current = wasConfirmed

    if (!justConfirmed) {
      if (!wasConfirmed && progress.current.value !== 0) {
        progressTween.current?.kill()
        progress.current.value = 0
        material.uBurstProgress = 0
      }
      return
    }

    progressTween.current?.kill()
    progress.current.value = 0
    material.uBurstProgress = 0

    progressTween.current = gsap.to(progress.current, {
      value: 1,
      duration: 1.3,
      ease: 'power2.out',
      onComplete: () => {
        progress.current.value = 1
        material.uBurstProgress = 1
      },
    })
  }, [wasConfirmed])

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
          ref={gemTargetAttribute}
          attach="attributes-gemTarget"
          args={[gemTargets, 3]}
          count={gemTargets.length / 3}
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
          ref={colourAttribute}
          attach="attributes-colour"
          args={[colours, 3]}
          count={colours.length / 3}
          itemSize={3}
        />
      </bufferGeometry>

      <PointsShaderMaterial
        key={CustomPointsShaderMaterial.key}
        ref={materialRef}
        {...INITIAL_POINTS_UNIFORMS}
        uDpr={dpr}
        uGemPosition={gemParentPosition}
        uGemScale={gemScale}
        transparent={true}
        depthTest={false}
        blending={AdditiveBlending}
        defines={{ USE_DISTANCE_FADE: useDistanceFade ? 1 : 0 }}
      />
    </points>
  )
}

export default Particles
