'use client'

import { shaderMaterial, useTexture } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import { type FC, Suspense, useLayoutEffect, useRef } from 'react'
import { BufferAttribute, Texture, type PlaneGeometry } from 'three'

import { TILE_SIZE } from '@/utils/tiles'

import fragmentShader from '@/components/backdrop/backdrop.frag'
import vertexShader from '@/components/backdrop/backdrop.vert'
import backdrop from '@/assets/textures/backdrop/bg-1.webp'

const BACKDROP_SEGMENT_COUNT = 6
const BACKDROP_FLOOR_RATIO = 1
const BACKDROP_WIDTH_TILES = 88
const BACKDROP_DEPTH_TILES = 20
const BACKDROP_HEIGHT = 32
const BACKDROP_WIDTH = TILE_SIZE * BACKDROP_WIDTH_TILES
const BACKDROP_DEPTH = TILE_SIZE * BACKDROP_DEPTH_TILES
const BACKDROP_POSITION: [number, number, number] = [0, -5, -14]
const BACKDROP_ROTATION: [number, number, number] = [-Math.PI / 2, 0, Math.PI / 2]
const BACKDROP_DARKNESS = 0.42
const BACKDROP_EDGE_FADE = 0.16
// TODO: re-export backdrop with optimal aspect ratio based on calculations in Backdrop component

type BackdropShaderUniforms = {
  uBackdrop: Texture | null
  uDarkness: number
  uEdgeFade: number
}

const INITIAL_BACKDROP_UNIFORMS: BackdropShaderUniforms = {
  uBackdrop: null,
  uDarkness: BACKDROP_DARKNESS,
  uEdgeFade: BACKDROP_EDGE_FADE,
}

const BackdropShader = shaderMaterial(INITIAL_BACKDROP_UNIFORMS, vertexShader, fragmentShader)

const BackdropShaderMaterial = extend(BackdropShader)

const easeInExpo = (value: number) =>
  value <= 0 ? 0 : Math.pow(2, 10 * Math.min(value, 1) - 10)

const Backdrop: FC = () => {
  const backdropColour = useTexture(backdrop.src)
  const geometryRef = useRef<PlaneGeometry | null>(null)

  useLayoutEffect(() => {
    const geometry = geometryRef.current
    if (!geometry) return

    const segmentCount = BACKDROP_SEGMENT_COUNT
    let i = 0
    const offset = 0.5
    const position = geometry.attributes.position as BufferAttribute
    const uv = geometry.attributes.uv as BufferAttribute
    const rowLength = segmentCount + 1
    const arcLengths: number[] = new Array(rowLength).fill(0)

    for (let x = 0; x <= segmentCount; x++) {
      for (let y = 0; y <= segmentCount; y++) {
        // Calculate normalized depth (x-axis in grid)
        // offset centers the grid.
        // BACKDROP_FLOOR_RATIO adds extra length to the start (floor) of the curve
        const depthNormalized =
          x / segmentCount - offset + (x === 0 ? -BACKDROP_FLOOR_RATIO : 0)

        // Calculate normalized width (y-axis in grid)
        const widthNormalized = y / segmentCount - offset

        position.setXYZ(
          i++,
          depthNormalized * BACKDROP_DEPTH, // X coordinate: Depth
          widthNormalized * BACKDROP_WIDTH, // Y coordinate: Width
          easeInExpo(x / segmentCount) * BACKDROP_HEIGHT, // Z coordinate: Height (curved upwards)
        )
      }

      if (x > 0) {
        const previousIndex = (x - 1) * rowLength
        const currentIndex = x * rowLength
        const deltaDepth = position.getX(currentIndex) - position.getX(previousIndex)
        const deltaHeight = position.getZ(currentIndex) - position.getZ(previousIndex)
        arcLengths[x] = arcLengths[x - 1] + Math.hypot(deltaDepth, deltaHeight)
      }
    }

    const totalArcLength = arcLengths[rowLength - 1] || 1

    // Log the optimal aspect ratio for the texture
    // This helps in preparing the texture image with the correct dimensions to avoid stretching
    if (process.env.NODE_ENV !== 'production') {
      console.warn(
        'Backdrop Texture Optimal Aspect Ratio (Width / ArcLength):',
        BACKDROP_WIDTH / totalArcLength,
      )
      // CURRENT: 1.325
    }
    for (let x = 0; x <= segmentCount; x++) {
      const v = arcLengths[x] / totalArcLength
      for (let y = 0; y <= segmentCount; y++) {
        const index = x * rowLength + y
        const u = y / segmentCount
        uv.setXY(index, u, v)
      }
    }
    position.needsUpdate = true
    uv.needsUpdate = true
    geometry.computeVertexNormals()
  }, [])

  return (
    <Suspense fallback={null}>
      <mesh position={BACKDROP_POSITION} rotation={BACKDROP_ROTATION}>
        <planeGeometry
          ref={geometryRef}
          args={[1, 1, BACKDROP_SEGMENT_COUNT, BACKDROP_SEGMENT_COUNT]}
        />
        <BackdropShaderMaterial
          depthTest={false}
          key={BackdropShader.key}
          uBackdrop={backdropColour}
          uDarkness={BACKDROP_DARKNESS}
          uEdgeFade={BACKDROP_EDGE_FADE}
        />
      </mesh>
    </Suspense>
  )
}

export default Backdrop
