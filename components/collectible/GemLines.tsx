'use client'

import { type FC, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

const BASE_GEOMETRY = new THREE.OctahedronGeometry(1, 0)
const GEM_EDGES_GEOMETRY = new THREE.EdgesGeometry(BASE_GEOMETRY)

const GEM_ROTATION_SPEED = 1

export type GemLinesProps = React.ComponentProps<'group'> & {
  color?: THREE.ColorRepresentation
  opacity?: number
}

const GemLines: FC<GemLinesProps> = ({ color = 0xffffff, opacity = 0.35, ...props }) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    const group = groupRef.current
    if (!group) return
    group.rotation.z += delta * GEM_ROTATION_SPEED
  })

  return (
    <group ref={groupRef} {...props}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        <lineSegments geometry={GEM_EDGES_GEOMETRY} dispose={null}>
          <lineBasicMaterial
            attach="material"
            color={color}
            transparent={true}
            opacity={1.0}
            depthWrite={false}
            toneMapped={false}
          />
        </lineSegments>
      </group>
    </group>
  )
}

export default GemLines
