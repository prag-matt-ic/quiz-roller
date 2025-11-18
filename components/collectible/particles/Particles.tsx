import { shaderMaterial } from '@react-three/drei'
import { extend, useFrame, useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { type FC, useCallback, useEffect, useMemo, useRef } from 'react'
import { BufferAttribute, Color, Points, Vector3 } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'

import particleFragment from './point.frag'
import particleVertex from './point.vert'
import { useControls } from 'leva'

const PARTICLE_COLOUR_HEX = [
  '#509e7b',
  '#00ea89',
  '#00f394',
  '#00ffa8',
  '#00f68b',
  '#00ffac',
  '#00f299',
  '#35ffb7',
  '#d0fceb',
  '#dfeee7',
  '#267152',
] as const

type PointsShaderUniforms = {
  uBurstProgress: number
  uPlayerPosition: Vector3
  uDpr: number
}

const INITIAL_POINTS_UNIFORMS: PointsShaderUniforms = {
  uBurstProgress: 0,
  uPlayerPosition: new Vector3(),
  uDpr: 1,
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
}

const Particles: FC<Props> = ({ width, height, wasConfirmed = false }) => {
  const particleCount = usePerformanceStore((s) => s.sceneConfig.answerTile.particleCount)
  const dpr = useThree((s) => s.viewport.dpr)
  const goToStage = useGameStore((s) => s.goToStage)

  const points = useRef<Points>(null)
  const materialRef = useRef<(typeof PointsShaderMaterial & PointsShaderUniforms) | null>(null)

  const progress = useRef({ value: 0 })
  const progressTween = useRef<GSAPTween | null>(null)
  const isActive = useRef(false)
  const hasMounted = useRef(false)
  const previouslyConfirmed = useRef(false)

  const playerLocalPosition = useRef(new Vector3())
  const { playerPosition } = usePlayerPosition()

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
  const seeds = useMemo(() => new Float32Array(particleCount), [particleCount])
  const colours = useMemo(
    () => new Float32Array(positionComponentCount),
    [positionComponentCount],
  )

  const spawnAttribute = useRef<BufferAttribute>(null)
  const seedAttribute = useRef<BufferAttribute>(null)
  const colourAttribute = useRef<BufferAttribute>(null)
  const colourTemp = useRef(new Color())

  const refreshSeeds = useCallback(() => {
    if (!seedAttribute.current) {
      console.error('Seed attribute not initialized')
      return
    }
    /* eslint-disable react-hooks/immutability */
    for (let i = 0; i < particleCount; i++) {
      seeds[i] = Math.random()
    }
    /* eslint-enable react-hooks/immutability */
    seedAttribute.current.needsUpdate = true
  }, [particleCount, seeds])

  const assignColours = useCallback(() => {
    if (!colourAttribute.current) {
      console.error('Colour attribute not initialized')
      return
    }
    const tempColour = colourTemp.current
    /* eslint-disable react-hooks/immutability */
    for (let i = 0; i < particleCount; i++) {
      const colourOffset = i * 3
      const colourIndex = Math.floor(Math.random() * PARTICLE_COLOUR_HEX.length)

      tempColour.set(PARTICLE_COLOUR_HEX[colourIndex])

      colours[colourOffset] = tempColour.r
      colours[colourOffset + 1] = tempColour.g
      colours[colourOffset + 2] = tempColour.b
    }
    /* eslint-enable react-hooks/immutability */
    colourAttribute.current.needsUpdate = true
  }, [colours, particleCount])

  useEffect(() => {
    const initializeStaticParticleData = () => {
      /* eslint-disable react-hooks/immutability */
      for (let i = 0; i < particleCount; i++) {
        const spawnIndex = i * 3
        // Spawn within tile footprint (local space)
        spawnPositions[spawnIndex] = (Math.random() - 0.5) * width
        spawnPositions[spawnIndex + 1] = 0
        spawnPositions[spawnIndex + 2] = (Math.random() - 0.5) * height
      }
      /* eslint-enable react-hooks/immutability */
      if (spawnAttribute.current) {
        spawnAttribute.current.needsUpdate = true
      }
      assignColours()
    }
    initializeStaticParticleData()
  }, [assignColours, height, particleCount, spawnPositions, width])

  useEffect(() => {
    refreshSeeds()
  }, [refreshSeeds])

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
    isActive.current = true

    materialRef.current.uBurstProgress = 0

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
  }, [goToStage, wasConfirmed])

  // useControls({
  //   progress: {
  //     value: 0,
  //     min: 0,
  //     max: 1,
  //     step: 0.01,
  //     onChange: (v) => {
  //       if (materialRef.current) {
  //         materialRef.current.uBurstProgress = v
  //       }
  //     },
  //   },
  // })

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
    <points
      ref={points}
      dispose={null}
      frustumCulled={false}
      rotation={[Math.PI / 2, 0, 0]}
      renderOrder={2}>
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
        transparent={true}
        depthTest={false}
      />
    </points>
  )
}

export default Particles
