'use client'

import { RapierRigidBody, RigidBody } from '@react-three/rapier'
import { type FC, useRef } from 'react'

const Terrain: FC = () => {
  const terrainRef = useRef<RapierRigidBody>(null)

  return (
    <RigidBody ref={terrainRef} type="fixed" colliders="cuboid" friction={0} mass={0}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={true}>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color="grey" />
      </mesh>
    </RigidBody>
  )
}

export default Terrain
