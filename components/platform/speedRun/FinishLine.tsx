import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import type { FC, PropsWithChildren, RefObject } from 'react'
import {
  CuboidCollider,
  type IntersectionEnterHandler,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import fragmentShader from './finishLine.frag'
import vertexShader from './finishLine.vert'
import { HIDDEN_POSITION, TILE_SIZE } from '@/utils/tiles'
import type { FinishLineUserData, RigidBodyUserData } from '@/model/schema'
import { useGameStore } from '@/components/GameProvider'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'

type FinishLineShaderUniforms = {
  uAspect: number
  uOpacity: number
  uTilesX: number
  uTilesY: number
}

const INITIAL_UNIFORMS: FinishLineShaderUniforms = {
  uAspect: 1,
  uOpacity: 1,
  uTilesX: 1,
  uTilesY: 1,
}

const FinishLineShader = shaderMaterial(INITIAL_UNIFORMS, vertexShader, fragmentShader)
const FinishLineShaderMaterial = extend(FinishLineShader)

type Props = PropsWithChildren<{
  ref?: RefObject<RapierRigidBody | null>
  width: number
  height: number
}>

const FinishLine: FC<Props> = ({ ref, width, height }) => {
  const finishSpeedRun = useGameStore((s) => s.finishSpeedRun)

  const userData: FinishLineUserData = {
    type: 'finish-line',
  }

  const lookAtInfo = () => {
    // if (!ref || !ref.current) return
    // const currentTranslation = ref.current.translation()
    // const targetPosition = new Vector3(
    //   currentTranslation.x - infoPositionOffset[0],
    //   currentTranslation.y - infoPositionOffset[1],
    //   currentTranslation.z - infoPositionOffset[2],
    // )
    // setCameraLookAtPosition(targetPosition)
  }

  const onIntersectionEnter: IntersectionEnterHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return
    if (otherUserData.type !== 'player') return
    finishSpeedRun()
    lookAtInfo()
  }

  return (
    <RigidBody
      ref={ref}
      // KEEP DYNAMIC
      type="dynamic"
      gravityScale={0}
      friction={0}
      mass={0}
      position={HIDDEN_POSITION}
      rotation={[-Math.PI / 2, 0, 0]}
      colliders={false}
      userData={userData}>
      <CuboidCollider
        args={[width / 2, height / 2, PLAYER_RADIUS * 2]}
        sensor={true}
        mass={0}
        friction={0}
        onIntersectionEnter={onIntersectionEnter}
        collisionGroups={COLLISION_GROUPS.finishLineSensor}
      />
      <mesh position={[0, 0, 0.01]} renderOrder={2}>
        <planeGeometry args={[width, height]} />
        <FinishLineShaderMaterial
          transparent={true}
          opacity={1}
          uAspect={width / height}
          uTilesX={width / TILE_SIZE}
          uTilesY={height / TILE_SIZE}
        />
      </mesh>
    </RigidBody>
  )
}

export default FinishLine
