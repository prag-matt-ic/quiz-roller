'use client'

import { ActiveCollisionTypes } from '@dimforge/rapier3d-compat'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { type FC } from 'react'

import type { OutOfBoundsUserData } from '@/model/schema'
import { COLUMNS, ROWS_RENDERED, TILE_SIZE } from '@/utils/tiles'

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
        position={[0, -6, 0]}
        args={[COLUMNS * TILE_SIZE + 10, 1, ROWS_RENDERED * TILE_SIZE + 10]}
        sensor={true}
        activeCollisionTypes={
          ActiveCollisionTypes.DEFAULT | ActiveCollisionTypes.KINEMATIC_FIXED
        }
      />
      {/* <mesh position={[0, -6, 0]}>
        <boxGeometry args={[COLUMNS * TILE_SIZE + 10, 1, ROWS_RENDERED * TILE_SIZE + 10]} />
        <meshBasicMaterial color="red" />
      </mesh> */}
    </RigidBody>
  )
}

export default OutOfBounds
