import { shaderMaterial } from '@react-three/drei'
import { extend, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { type FC, useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, Color, Vector3, type Vector3Tuple } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import particleFragment from './point.frag'
import particleVertex from './point.vert'
import useGameFrame from '@/hooks/useGameFrame'

// TODO: create a new palette based on the gem colour (yellow/orange)
const PARTICLE_COLOUR_HEX = [
  '#ecb21e',
  '#f6b253',
  '#ffd146',
  '#facc00',
  '#ffc723',
  '#fff330',
  '#ffd33e',
  '#ffe65d',
  '#ffdf25',
  '#fffef3',
  '#f6e6c3',
  '#7f6639',
  '#ffd955',
  '#ffec5a',
  '#ffc700',
  '#ffcd3a',
  '#ffca31',
  '#ffdd56',
  '#ffbe24',
  '#fffbe3',
  '#ffefd0',
  '#896544',
] as const

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
  tileWidth: number
  tileHeight: number
  wasConfirmed: boolean
  gemPosition: Vector3Tuple
  gemScale: number
  position?: Vector3Tuple
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

const createRandomColours = (count: number): Float32Array => {
  const values = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const offset = i * 3
    const colourIndex = Math.floor(Math.random() * PARTICLE_COLOUR_HEX.length)
    tempColour.set(PARTICLE_COLOUR_HEX[colourIndex])
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
  tileWidth,
  tileHeight,
  wasConfirmed = false,
  gemPosition,
  gemScale,
  position = [0, 0, 0],
}) => {
  const particleCount = usePerformanceStore((s) => s.sceneConfig.gem.particleCount)
  const dpr = useThree((s) => s.viewport.dpr)
  const goToStage = useGameStore((s) => s.goToStage)

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
  const colours = useMemo(() => createRandomColours(particleCount), [particleCount])

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
    if (!materialRef.current) return

    if (!hasMounted.current) {
      hasMounted.current = true
      previouslyConfirmed.current = wasConfirmed
      return
    }

    const justConfirmed = wasConfirmed && !previouslyConfirmed.current
    previouslyConfirmed.current = wasConfirmed

    if (!justConfirmed) return

    progressTween.current?.kill()
    progress.current.value = 0
    materialRef.current.uBurstProgress = 0

    progressTween.current = gsap.to(progress.current, {
      value: 1,
      duration: 1.3,
      ease: 'power2.out',
      onComplete: () => {
        progress.current.value = 1
        materialRef.current!.uBurstProgress = 1
        goToStage(Stage.TERRAIN)
      },
    })
  }, [goToStage, wasConfirmed])

  useEffect(() => {
    return () => {
      progressTween.current?.kill()
    }
  }, [])

  useGameFrame(({ clock }) => {
    const material = materialRef.current
    if (!material) return

    material.uBurstProgress = progress.current.value
    material.uTime = clock.elapsedTime
  })

  return (
    <points position={position} dispose={null} frustumCulled={false}>
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
      />
    </points>
  )
}

export default Particles
