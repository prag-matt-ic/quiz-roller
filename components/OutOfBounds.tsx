'use client'

import { ActiveCollisionTypes } from '@dimforge/rapier3d-compat'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { type FC } from 'react'

import type { OutOfBoundsUserData } from '@/model/schema'

const OutOfBounds: FC = () => {
  const userData: OutOfBoundsUserData = { type: 'out-of-bounds' }

  return (
    <RigidBody
      type="fixed"
      friction={0}
      colliders={false}
      position={[0, 0, 0]}
      userData={userData}>
      {/* Large, sensor plane below the playable tiles to trigger game over / reset */}
      <CuboidCollider
        position={[0, -10, 0]}
        args={[50, 1, 50]}
        sensor={true}
        activeCollisionTypes={
          ActiveCollisionTypes.DEFAULT | ActiveCollisionTypes.KINEMATIC_FIXED
        }
      />
    </RigidBody>
  )
}

export default OutOfBounds
