/* eslint-disable react-hooks/refs */
import {
  RigidBody,
  type RapierRigidBody,
  BallCollider,
  type IntersectionEnterHandler,
} from '@react-three/rapier'
import {
  type FC,
  useCallback,
  useImperativeHandle,
  useRef,
  type RefObject,
  useEffect,
} from 'react'
import { shaderMaterial } from '@react-three/drei'
// import { extend } from '@react-three/fiber'

import ringVert from './shaders/ring.vert'
import ringFrag from './shaders/ring.frag'

import {
  colToX,
  HIDE_POSITION_Y,
  HIDE_POSITION_Z,
  ON_TILE_Y,
  type RowData,
} from '@/utils/tiles'

import type { RigidBodyUserData, RingUserData } from '@/model/schema'
import { type RingIndex, useGameStore } from '@/components/GameProvider'
import { usePerformanceStore } from '@/components/PerformanceProvider'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'
import useGameFrame from '@/hooks/useGameFrame'
import { Color, type ShaderMaterial } from 'three'
import { getRingKey } from '@/utils/rings'
import { extend } from '@react-three/fiber'

const MAX_RING_INSTANCES = 10
const RING_MAJOR_RADIUS = 0.3
const RING_TUBE_RADIUS = 0.05
const RING_WORLD_Y = ON_TILE_Y + RING_MAJOR_RADIUS * 2
const HIDDEN_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]
const IS_DEV_ENV = process.env.NODE_ENV !== 'production'
const RAND_SEED_X = 12.98
const RAND_SEED_Y = 43758.54
const TAU = Math.PI * 2

const hashSlotIndex = (slotIndex: number): number => {
  const seed = slotIndex + 1
  const raw = Math.sin(seed * RAND_SEED_X) * RAND_SEED_Y
  return raw - Math.floor(raw)
}

export type RingsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type RingUniforms = {
  uTime: number
  uColor: Color
  uEmissive: Color
  uRotationSpeed: number
  uRotationPhase: number
}

const DEFAULT_UNIFORMS: RingUniforms = {
  uTime: 0,
  uColor: new Color('#ffe066'),
  uEmissive: new Color('#ffd43b'),
  uRotationSpeed: 1,
  uRotationPhase: 0,
}

const RingsShader = shaderMaterial(DEFAULT_UNIFORMS, ringVert, ringFrag)

const RingsShaderMaterial = extend(RingsShader)

type Props = {
  ref: RefObject<RingsHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const Rings: FC<Props> = ({ ref, onReadyChange }) => {
  const collectedRings = useGameStore((s) => s.collectedRings)
  const onRingCollected = useGameStore((s) => s.onRingCollected)
  const ringConfig = usePerformanceStore((s) => s.sceneConfig.ring)

  const rigidBodies = useRef<Array<RapierRigidBody | null>>(
    Array(MAX_RING_INSTANCES).fill(null),
  )

  const slotAssignments = useRef<(RingIndex | null)[]>(Array(MAX_RING_INSTANCES).fill(null))
  const rowToSlots = useRef<Map<number, number[]>>(new Map())
  const translation = useRef({ x: 0, y: 0, z: 0 })

  const setBodyTranslation = useCallback(
    (slotIndex: number, x: number, y: number, z: number) => {
      const body = rigidBodies.current[slotIndex]
      if (!body) return
      translation.current.x = x
      translation.current.y = y
      translation.current.z = z
      body.setTranslation(translation.current, true)
    },
    [],
  )

  const releaseRow = useCallback(
    (rowIndex: number) => {
      if (rowIndex < 0) return
      const slots = rowToSlots.current.get(rowIndex)
      if (!slots) return
      slots.forEach((slotIndex) => {
        slotAssignments.current[slotIndex] = null
        setBodyTranslation(
          slotIndex,
          HIDDEN_POSITION[0],
          HIDDEN_POSITION[1],
          HIDDEN_POSITION[2],
        )
      })
      rowToSlots.current.delete(rowIndex)
    },
    [setBodyTranslation],
  )

  const ensureRingForColumn = useCallback(
    (rowIndex: number, columnIndex: number, rowZ: number) => {
      if (rowIndex < 0) return
      const existingSlot = slotAssignments.current.findIndex((assignment) => {
        if (!assignment) return false
        return assignment[0] === rowIndex && assignment[1] === columnIndex
      })

      const x = colToX(columnIndex)
      const z = rowZ

      if (existingSlot >= 0) {
        setBodyTranslation(existingSlot, x, RING_WORLD_Y, z)
        return
      }

      const availableSlot = slotAssignments.current.findIndex(
        (assignment) => assignment === null,
      )
      if (availableSlot === -1) {
        if (IS_DEV_ENV) {
          console.warn(
            '[RingElements] Exceeded ring pool capacity. Increase MAX_RING_INSTANCES.',
          )
        }
        return
      }

      slotAssignments.current[availableSlot] = [rowIndex, columnIndex]
      const slotsForRow = rowToSlots.current.get(rowIndex) ?? []
      slotsForRow.push(availableSlot)
      rowToSlots.current.set(rowIndex, slotsForRow)
      setBodyTranslation(availableSlot, x, RING_WORLD_Y, z)
    },
    [setBodyTranslation],
  )

  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row) return
      if (!row.ringPositions) return
      if (row.ringPositions.every((flag) => flag !== 1)) return
      const rowIndex = row.rowIndex ?? -1
      if (rowIndex < 0) return

      for (let columnIndex = 0; columnIndex < row.ringPositions.length; columnIndex++) {
        if (row.ringPositions[columnIndex] !== 1) continue
        if (collectedRings[getRingKey(rowIndex, columnIndex)]) continue
        ensureRingForColumn(rowIndex, columnIndex, rowZ)
      }
    },
    [collectedRings, ensureRingForColumn],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData | undefined) => {
      if (!row) return
      if (!row.ringPositions) return
      releaseRow(row.rowIndex ?? -1)
    },
    [releaseRow],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (zStep === 0) return
      for (let slotIndex = 0; slotIndex < slotAssignments.current.length; slotIndex++) {
        if (!slotAssignments.current[slotIndex]) continue
        const body = rigidBodies.current[slotIndex]
        if (!body) continue
        const currentTranslation = body.translation()
        setBodyTranslation(
          slotIndex,
          currentTranslation.x,
          currentTranslation.y,
          currentTranslation.z + zStep,
        )
      }
    },
    [setBodyTranslation],
  )

  useImperativeHandle(
    ref,
    () => ({
      moveElements,
      positionElementsIfNeeded,
      hideElementsIfNeeded,
    }),
    [moveElements, positionElementsIfNeeded, hideElementsIfNeeded],
  )

  useEffect(() => {
    onReadyChange(true)
    return () => {
      onReadyChange(false)
    }
  }, [onReadyChange])

  const onIntersectionEnter: IntersectionEnterHandler = (event) => {
    const otherUserData = event.other.rigidBodyObject?.userData as RigidBodyUserData
    if (!otherUserData) return
    if (otherUserData.type !== 'player') return
    const slotIndex = (event.target.rigidBodyObject?.userData as RingUserData).slotIndex
    const indexes = slotAssignments.current[slotIndex]
    if (!indexes) return
    onRingCollected(indexes)
  }

  const ringMaterials = useRef<Array<(ShaderMaterial & RingUniforms) | null>>(
    Array(MAX_RING_INSTANCES).fill(null),
  )

  useGameFrame(({ clock }) => {
    const time = clock.elapsedTime
    const materials = ringMaterials.current
    for (let index = 0; index < materials.length; index++) {
      const material = materials[index]
      if (!material) continue
      material.uTime = time
    }
  })

  const slots = slotAssignments.current

  return (
    <group>
      {Array.from({ length: MAX_RING_INSTANCES }).map((_, slotIndex) => {
        const assignedIndexes = slots[slotIndex]
        const ringKey =
          assignedIndexes != null ? getRingKey(assignedIndexes[0], assignedIndexes[1]) : null
        const isCollected = ringKey ? Boolean(collectedRings[ringKey]) : false
        const baseSeed = hashSlotIndex(slotIndex)
        const rotationSpeed = 0.6 + baseSeed * 0.7
        const rotationPhase = baseSeed * TAU
        return (
          <RigidBody
            key={`ring-slot-${slotIndex}`}
            ref={(body) => {
              rigidBodies.current[slotIndex] = body
            }}
            type="dynamic"
            canSleep={true}
            position={HIDDEN_POSITION}
            userData={{ type: 'ring', slotIndex: slotIndex } as RingUserData}
            colliders={false}
            gravityScale={0}>
            <BallCollider
              args={[RING_MAJOR_RADIUS + RING_TUBE_RADIUS * 0.5]}
              sensor={true}
              onIntersectionEnter={onIntersectionEnter}
              collisionGroups={COLLISION_GROUPS.ringSensor}
            />
            <mesh visible={!isCollected}>
              <torusGeometry
                args={[
                  RING_MAJOR_RADIUS,
                  RING_TUBE_RADIUS,
                  ringConfig.radialSegments,
                  ringConfig.tubularSegments,
                ]}
              />
              <RingsShaderMaterial
                ref={(material) => {
                  ringMaterials.current[slotIndex] = material
                }}
                key={RingsShader.key}
                {...DEFAULT_UNIFORMS}
                uRotationSpeed={rotationSpeed}
                uRotationPhase={rotationPhase}
              />
            </mesh>
          </RigidBody>
        )
      })}
    </group>
  )
}

export default Rings
