import { COLUMNS, HIDDEN_POSITION, TILE_SIZE } from '@/utils/tiles'
import { RigidBody, type RapierRigidBody } from '@react-three/rapier'
import { useEffect, type FC, type RefObject } from 'react'
import { type Vector3Tuple } from 'three'

import { Stage, useGameStore } from '@/components/GameProvider'

const WALL_WIDTH = COLUMNS * TILE_SIZE

type Props = {
  ref: RefObject<RapierRigidBody | null>
  position: Vector3Tuple
}

const InvisibleWall: FC<Props> = ({ ref, position }) => {
  const isTerrainStage = useGameStore((s) => s.stage === Stage.OBSTACLES)

  useEffect(() => {
    if (!ref.current) return
    if (!isTerrainStage) return
    // Hide the wall during terrain stage
    ref.current.setTranslation(
      { x: HIDDEN_POSITION[0], y: HIDDEN_POSITION[1], z: HIDDEN_POSITION[2] },
      false,
    )
  }, [isTerrainStage, ref])

  return (
    <RigidBody
      ref={ref}
      type="fixed"
      gravityScale={0}
      friction={0}
      position={position}
      sensor={false}
      canSleep={true}
      colliders="cuboid"
      rotation={[0, 0, 0]}>
      <mesh>
        <planeGeometry args={[WALL_WIDTH, 2]} />
        <meshBasicMaterial depthTest={false} transparent={true} opacity={0} />
      </mesh>
    </RigidBody>
  )
}

export default InvisibleWall
