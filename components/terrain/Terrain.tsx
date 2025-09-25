'use client'

import { RigidBody } from '@react-three/rapier'
import { type FC } from 'react'

const Terrain: FC = () => {
  return (
    <RigidBody type="fixed" colliders="cuboid">
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={true}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="grey" />
      </mesh>
    </RigidBody>
  )
}

export default Terrain
