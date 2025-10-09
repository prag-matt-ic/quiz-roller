'use client'

import { ActiveCollisionTypes } from '@dimforge/rapier3d-compat'
import { CuboidCollider, RigidBody } from '@react-three/rapier'
import { type FC } from 'react'

import { Stage, useGameStore } from '@/components/GameProvider'
import type { OutOfBoundsUserData } from '@/model/schema'

const OutOfBounds: FC = () => {
  const userData: OutOfBoundsUserData = { type: 'out-of-bounds' }
  const goToStage = useGameStore((state) => state.goToStage)

  const handleIntersectionEnter = () => {
    goToStage(Stage.GAME_OVER)
  }

  return (
    <RigidBody type="fixed" colliders={false} position={[0, 0, 0]} userData={userData}>
      {/* Large, thin sensor plane below the playable tiles. Half-extents used here. */}
      <CuboidCollider
        position={[0, -6, 0]}
        args={[50, 1, 50]}
        activeCollisionTypes={
          ActiveCollisionTypes.DEFAULT | ActiveCollisionTypes.KINEMATIC_FIXED
        }
        sensor={true}
        onIntersectionEnter={handleIntersectionEnter}
      />
    </RigidBody>
  )
}

export default OutOfBounds
