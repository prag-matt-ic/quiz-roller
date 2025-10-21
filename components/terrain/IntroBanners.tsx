'use client'

import { Text } from '@react-three/drei'
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { Group } from 'three'

import {
  colToX,
  COLUMNS,
  getIntroCorridorBounds,
  SAFE_HEIGHT,
  TILE_SIZE,
} from '@/components/terrain/terrainBuilder'
import {
  INTRO_BANNERS_CONTENT,
  INTRO_BANNERS_SPACING_ROWS,
  INTRO_BANNERS_START_PADDING_ROWS,
} from '@/resources/intro'

const INWARD_ROTATION_RADIANS = (30 * Math.PI) / 180

export type IntroBannersHandle = {
  // Move banners forward in +Z by the given world-unit step
  advance: (zStep: number) => void
}

type Props = {
  zOffset: number
  isVisible: boolean
}

// Lightweight banner planes staggered along the entry corridor. No per-frame allocations.
export const IntroBanners = forwardRef<IntroBannersHandle, Props>(
  ({ zOffset, isVisible }, ref) => {
    const groupRef = useRef<Group>(null)

    // Precompute static banner local positions (relative to the group)
    const bannerPositions = useMemo(() => {
      const { startCol, endCol } = getIntroCorridorBounds()
      const leftCol = Math.max(0, startCol - 2)
      const rightCol = Math.min(COLUMNS - 1, endCol + 2)
      const leftX = colToX(leftCol)
      const rightX = colToX(rightCol)
      const y = SAFE_HEIGHT + 1.5

      const positions: {
        x: number
        y: number
        z: number
        rotationY: number
      }[] = []
      // Place banners from content array with start/end padding and spacing
      for (let i = 0; i < INTRO_BANNERS_CONTENT.length; i++) {
        const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right'
        const x = side === 'left' ? leftX : rightX
        const row = INTRO_BANNERS_START_PADDING_ROWS + i * INTRO_BANNERS_SPACING_ROWS
        const z = -row * TILE_SIZE + zOffset
        const rotationY = side === 'left' ? INWARD_ROTATION_RADIANS : -INWARD_ROTATION_RADIANS
        positions.push({ x, y, z, rotationY })
      }
      return positions
    }, [zOffset])

    useImperativeHandle(
      ref,
      () => ({
        advance: (zStep: number) => {
          if (!isVisible) return
          if (!groupRef.current) return
          groupRef.current.position.z += zStep
        },
      }),
      [isVisible],
    )

    return (
      <group ref={groupRef} visible={isVisible}>
        {bannerPositions.map((p, i) => (
          <group
            key={`intro-banner-${i}`}
            position={[p.x, p.y, p.z]}
            rotation={[0, p.rotationY, 0]}>
            <mesh>
              <planeGeometry args={[3, 2, 1, 1]} />
              <meshBasicMaterial color="#fff" />
            </mesh>
            <Text
              fontSize={0.2}
              color="#000"
              anchorX="center"
              anchorY="middle"
              maxWidth={1.8}
              position={[0, 0, 0.01]}>
              {INTRO_BANNERS_CONTENT[i]}
            </Text>
          </group>
        ))}
      </group>
    )
  },
)

IntroBanners.displayName = 'IntroBanners'

export default IntroBanners
