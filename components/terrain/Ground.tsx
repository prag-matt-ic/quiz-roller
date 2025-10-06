'use client'

import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { type FC } from 'react'

import type { OutOfBoundsUserData } from '@/model/schema'

const Ground: FC = () => {
  const userData: OutOfBoundsUserData = { type: 'out-of-bounds' }

  return (
    <RigidBody type="fixed" colliders={false} userData={userData}>
      <CuboidCollider args={[200, 2 / 2, 400]} position={[0, -40, 0]} sensor />
    </RigidBody>
  )
}

export default Ground
