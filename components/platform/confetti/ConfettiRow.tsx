'use client'

import {
  CuboidCollider,
  type IntersectionEnterHandler,
  RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import { type FC, type RefObject, useCallback, useEffect, useMemo } from 'react'
import { type Vector3Tuple } from 'three'

import {
  default as ConfettiParticleEmitter,
  ConfettiParticleEmitterHandle,
} from '@/components/platform/confetti/ConfettiParticleEmitter'
import { PLAYER_RADIUS } from '@/components/player/PlayerHUD'
import { ConfettiUserData, type RigidBodyUserData } from '@/model/schema'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'
import { TILE_SIZE } from '@/utils/tiles'

type Props = {
  ref: RefObject<RapierRigidBody | null>
  isVisible: boolean
  width: number
  depth: number
  emitterRefs: readonly [
    RefObject<ConfettiParticleEmitterHandle | null>,
    RefObject<ConfettiParticleEmitterHandle | null>,
  ]
  index: number
  palette?: readonly string[]
}

const EMITTER_EDGE_PADDING = TILE_SIZE * 0.5

const ConfettiRow: FC<Props> = ({
  ref,
  isVisible,
  width,
  depth,
  emitterRefs,
  index,
  palette,
}) => {
  const [leftEmitterRef, rightEmitterRef] = emitterRefs

  const emitterOffset = useMemo(() => width * 0.5 + EMITTER_EDGE_PADDING, [width])

  const leftEmitterPosition = useMemo<Vector3Tuple>(
    () => [-emitterOffset, 0, 0],
    [emitterOffset],
  )
  const rightEmitterPosition = useMemo<Vector3Tuple>(
    () => [emitterOffset, 0, 0],
    [emitterOffset],
  )

  const userData = useMemo<ConfettiUserData>(
    () => ({
      type: 'confetti',
      confettiIndex: index,
    }),
    [index],
  )

  const triggerBurst = useCallback(() => {
    leftEmitterRef.current?.burst()
    rightEmitterRef.current?.burst()
  }, [leftEmitterRef, rightEmitterRef])

  const resetEmitters = useCallback(() => {
    leftEmitterRef.current?.reset()
    rightEmitterRef.current?.reset()
  }, [leftEmitterRef, rightEmitterRef])

  const onIntersectionEnter = useCallback<IntersectionEnterHandler>(
    (event) => {
      if (!isVisible) return
      const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
      if (!otherUserData || otherUserData.type !== 'player') return
      triggerBurst()
    },
    [isVisible, triggerBurst],
  )

  useEffect(() => {
    if (!isVisible) {
      resetEmitters()
    }
  }, [isVisible, resetEmitters])

  return (
    <RigidBody
      ref={ref}
      type="dynamic"
      gravityScale={0}
      friction={0}
      mass={0}
      position={[0, 0, 0]}
      colliders={false}
      userData={userData}>
      <CuboidCollider
        args={[width / 2, PLAYER_RADIUS, depth / 2]}
        sensor={true}
        mass={0}
        friction={0}
        collisionGroups={COLLISION_GROUPS.confettiSensor}
        onIntersectionEnter={onIntersectionEnter}
      />

      <ConfettiParticleEmitter
        ref={leftEmitterRef}
        position={leftEmitterPosition}
        isVisible={isVisible}
        seedOffset={index * 2}
        palette={palette}
      />
      <ConfettiParticleEmitter
        ref={rightEmitterRef}
        position={rightEmitterPosition}
        isVisible={isVisible}
        seedOffset={index * 2 + 1}
        palette={palette}
      />
    </RigidBody>
  )
}

export default ConfettiRow
