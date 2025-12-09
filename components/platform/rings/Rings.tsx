import {
  BallCollider,
  type IntersectionEnterHandler,
  type RapierRigidBody,
  RigidBody,
} from '@react-three/rapier'
import gsap from 'gsap'
import {
  type FC,
  type RefObject,
  createRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react'
import { type ShaderMaterial } from 'three'

import { type RingIndex, useGameStore } from '@/components/GameProvider'
import { SoundFX, useSoundStore } from '@/components/SoundProvider'
import Ring, { type RingUniforms } from '@/components/platform/rings/ring/Ring'
import useGameFrame from '@/hooks/useGameFrame'
import type { RigidBodyUserData, RingUserData } from '@/model/schema'
import { COLLISION_GROUPS } from '@/utils/collisionGroups'
import { getRingKey } from '@/utils/rings'
import { HIDDEN_POSITION, ON_TILE_Y, type RowData, colToX } from '@/utils/tiles'

const MAX_RING_INSTANCES = 16
const instancesArray = Array.from({ length: MAX_RING_INSTANCES }, (_, i) => i)
const RING_MAJOR_RADIUS = 0.3
const RING_TUBE_RADIUS = 0.05
const RING_WORLD_Y = ON_TILE_Y + RING_MAJOR_RADIUS * 2

const IS_DEV_ENV = process.env.NODE_ENV !== 'production'
const RAND_SEED_X = 12.98
const RAND_SEED_Y = 4375.54
const TAU = Math.PI * 2

const hashSlotIndex = (slotIndex: number): number => {
  const seed = slotIndex + 1
  const raw = Math.sin(seed * RAND_SEED_X) * RAND_SEED_Y
  return raw - Math.floor(raw)
}

export type RingsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData) => void
}

type Props = {
  ref: RefObject<RingsHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const Rings: FC<Props> = ({ ref, onReadyChange }) => {
  const playSoundFX = useSoundStore((s) => s.playSoundFX)
  const collectedRings = useGameStore((s) => s.collectedRings)
  const onRingCollected = useGameStore((s) => s.onRingCollected)

  const [rigidBodyRefs] = useState<RefObject<RapierRigidBody | null>[]>(
    instancesArray.map(() => createRef<RapierRigidBody | null>()),
  )

  const [shaderRefs] = useState<RefObject<(ShaderMaterial & RingUniforms) | null>[]>(() =>
    instancesArray.map(() => createRef<ShaderMaterial & RingUniforms>()),
  )

  const slotAssignments = useRef<(RingIndex | null)[]>(Array(MAX_RING_INSTANCES).fill(null))
  const rowToSlots = useRef<Map<number, number[]>>(new Map())
  const translation = useRef({ x: 0, y: 0, z: 0 })

  const setBodyTranslation = useCallback(
    (slotIndex: number, x: number, y: number, z: number) => {
      const body = rigidBodyRefs[slotIndex].current
      if (!body) return
      translation.current.x = x
      translation.current.y = y
      translation.current.z = z
      body.setTranslation(translation.current, true)
    },
    [rigidBodyRefs],
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
          console.error(
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
    (row: RowData, rowZ: number) => {
      if (!row.rings) return
      const rowIndex = row.rowIndex ?? -1
      if (rowIndex < 0) return
      for (let columnIndex = 0; columnIndex < row.rings.length; columnIndex++) {
        if (row.rings[columnIndex] !== 1) continue
        if (collectedRings[getRingKey(rowIndex, columnIndex)]) continue
        ensureRingForColumn(rowIndex, columnIndex, rowZ)
      }
    },
    [collectedRings, ensureRingForColumn],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData) => {
      if (!row.rings) return
      releaseRow(row.rowIndex ?? -1)
    },
    [releaseRow],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (zStep === 0) return
      for (let slotIndex = 0; slotIndex < slotAssignments.current.length; slotIndex++) {
        if (!slotAssignments.current[slotIndex]) continue
        const body = rigidBodyRefs[slotIndex].current
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
    [rigidBodyRefs, setBodyTranslation],
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

    const material = shaderRefs[slotIndex].current
    if (!material) return

    playSoundFX(SoundFX.RING_COLLECTED)
    // Animate the ring out then mark it as collected
    gsap.to(material, {
      uExitProgress: 1,
      duration: 0.4,
      ease: 'power1.out',
      onComplete: () => {
        onRingCollected(indexes)
        setTimeout(() => {
          material.uExitProgress = 0
        }, 100)
      },
    })
  }

  useGameFrame(({ clock }) => {
    const time = clock.elapsedTime
    const assignments = slotAssignments.current

    for (let index = 0; index < shaderRefs.length; index++) {
      const assignment = assignments[index]
      if (!assignment) continue

      const [rowIndex, colIndex] = assignment
      const ringKey = getRingKey(rowIndex, colIndex)
      if (collectedRings[ringKey]) continue

      const material = shaderRefs[index].current
      if (!material) continue
      // eslint-disable-next-line react-hooks/immutability
      material.uTime = time
    }
  })

  const slots = slotAssignments.current

  return (
    <>
      {rigidBodyRefs.map((rigidBody, slotIndex) => {
        const assignedIndexes = slots[slotIndex]
        const ringKey = !!assignedIndexes
          ? getRingKey(assignedIndexes[0], assignedIndexes[1])
          : null
        const isCollected = ringKey ? Boolean(collectedRings[ringKey]) : false
        const baseSeed = hashSlotIndex(slotIndex)
        const rotationSpeed = 0.6 + baseSeed * 0.7
        const rotationPhase = baseSeed * TAU
        const userData = { type: 'ring', slotIndex: slotIndex } as RingUserData
        return (
          <RigidBody
            key={`ring-slot-${slotIndex}`}
            ref={rigidBody}
            type="dynamic"
            canSleep={true}
            position={HIDDEN_POSITION}
            userData={userData}
            colliders={false}
            gravityScale={0}>
            <BallCollider
              args={[RING_MAJOR_RADIUS + RING_TUBE_RADIUS * 0.5]}
              sensor={true}
              onIntersectionEnter={onIntersectionEnter}
              collisionGroups={COLLISION_GROUPS.ringSensor}
            />
            <Ring
              isVisible={!isCollected}
              shaderRef={shaderRefs[slotIndex]}
              rotationSpeed={rotationSpeed}
              rotationPhase={rotationPhase}
              radius={RING_MAJOR_RADIUS}
              tubeRadius={RING_TUBE_RADIUS}
            />
          </RigidBody>
        )
      })}
    </>
  )
}

export default Rings
