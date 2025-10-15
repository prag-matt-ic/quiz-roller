'use client'

import { Text } from '@react-three/drei'
import { forwardRef, useImperativeHandle, useMemo, useRef } from 'react'
import { Group } from 'three'

import {
  colToX,
  COLUMNS,
  getIntroCorridorBounds,
  MAX_Z,
  SAFE_HEIGHT,
  TILE_SIZE,
} from '@/components/terrain/terrainBuilder'
import {
  INTRO_BANNERS_CONTENT,
  INTRO_BANNERS_SPACING_ROWS,
  INTRO_BANNERS_START_PADDING_ROWS,
} from '@/resources/intro'

export type IntroBannersHandle = {
  // Move banners forward in +Z by the given world-unit step
  advance: (zStep: number) => void
}

type Props = {
  // Initial row window offset used by Terrain to place visible rows
  zOffset: number
  // Optional visibility toggle (we still keep in scene graph for perf)
  visible?: boolean
}

// Lightweight banner planes staggered along the entry corridor. No per-frame allocations.
export const IntroBanners = forwardRef<IntroBannersHandle, Props>(
  ({ zOffset, visible = true }, ref) => {
    const groupRef = useRef<Group>(null)

    // Precompute static banner local positions (relative to the group)
    const bannerPositions = useMemo(() => {
      const { startCol, endCol } = getIntroCorridorBounds()
      const leftCol = Math.max(0, startCol - 2)
      const rightCol = Math.min(COLUMNS - 1, endCol + 2)
      const leftX = colToX(leftCol)
      const rightX = colToX(rightCol)
      const y = SAFE_HEIGHT + 1.5

      const positions: { x: number; y: number; z: number; side: 'left' | 'right' }[] = []
      // Place banners from content array with start/end padding and spacing
      for (let i = 0; i < INTRO_BANNERS_CONTENT.length; i++) {
        const side: 'left' | 'right' = i % 2 === 0 ? 'left' : 'right'
        const x = side === 'left' ? leftX : rightX
        const row = INTRO_BANNERS_START_PADDING_ROWS + i * INTRO_BANNERS_SPACING_ROWS
        const z = -row * TILE_SIZE + zOffset
        positions.push({ x, y, z, side })
      }
      return positions
    }, [zOffset])

    useImperativeHandle(
      ref,
      () => ({
        advance: (zStep: number) => {
          if (!groupRef.current) return
          if (groupRef.current.position.z > MAX_Z) return
          groupRef.current.position.z += zStep
        },
      }),
      [],
    )

    return (
      <group ref={groupRef} visible={visible}>
        {bannerPositions.map((p, i) => (
          <group key={`intro-banner-${i}`} position={[p.x, p.y, p.z]}>
            <mesh>
              <planeGeometry args={[2.8, 1.2, 1, 1]} />
              <meshBasicMaterial color={p.side === 'left' ? '#4CC9F0' : '#F72585'} />
            </mesh>
            <Text
              fontSize={0.28}
              color="#111"
              anchorX="center"
              anchorY="middle"
              maxWidth={2.6}
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
