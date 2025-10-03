'use client'

import { RapierRigidBody, RigidBody } from '@react-three/rapier'
import { type FC, useEffect, useRef } from 'react'

const Terrain: FC = () => {
  const terrainRef = useRef<RapierRigidBody>(null)
  useEffect(() => {
    if (!terrainRef.current) return
    // Move terrain down slightly so player doesn't visually clip through
    terrainRef.current.setLinvel({ x: 0, y: 0, z: 5 }, true)
  }, [])

  return (
    <RigidBody
      ref={terrainRef}
      type="kinematicVelocity"
      colliders="cuboid"
      friction={0}
      mass={0}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow={true}>
        <planeGeometry args={[12, 1000]} />
        <meshStandardMaterial color="grey" />
      </mesh>
    </RigidBody>
  )
}

export default Terrain
