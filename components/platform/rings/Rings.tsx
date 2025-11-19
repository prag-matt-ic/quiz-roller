import { RigidBody, type RapierRigidBody, BallCollider } from '@react-three/rapier'
import {
  type FC,
  useCallback,
  useImperativeHandle,
  useRef,
  type RefObject,
  useEffect,
} from 'react'

import {
  colToX,
  HIDE_POSITION_Y,
  HIDE_POSITION_Z,
  ON_TILE_Y,
  type RowData,
} from '@/utils/tiles'

const MAX_RING_INSTANCES = 12
const RING_MAJOR_RADIUS = 0.3
const RING_TUBE_RADIUS = 0.05
const RING_WORLD_Y = ON_TILE_Y + RING_MAJOR_RADIUS * 2
const HIDDEN_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]
const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

type SlotAssignment = {
  rowIndex: number
  columnIndex: number
}

export type RingElementsHandle = {
  isReady: boolean
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<RingElementsHandle | null>
}

const RING_COLOR = '#ffe066'
const RING_EMISSIVE = '#ffd43b'

const RingElements: FC<Props> = ({ ref }) => {
  const rigidBodies = useRef<Array<RapierRigidBody | null>>(
    Array(MAX_RING_INSTANCES).fill(null),
  )
  const slotAssignments = useRef<Array<SlotAssignment | null>>(
    Array(MAX_RING_INSTANCES).fill(null),
  )
  const rowToSlots = useRef<Map<number, number[]>>(new Map())
  const translation = useRef({ x: 0, y: 0, z: 0 })
  const hasWarnedCapacity = useRef(false)
  const isReady = useRef(false)

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
        return assignment.rowIndex === rowIndex && assignment.columnIndex === columnIndex
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
        if (!hasWarnedCapacity.current && IS_DEV_ENV) {
          console.warn(
            '[RingElements] Exceeded ring pool capacity. Increase MAX_RING_INSTANCES.',
          )
          hasWarnedCapacity.current = true
        }
        return
      }

      slotAssignments.current[availableSlot] = { rowIndex, columnIndex }
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
        ensureRingForColumn(rowIndex, columnIndex, rowZ)
      }
    },
    [ensureRingForColumn],
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
      get isReady() {
        return isReady.current
      },
      moveElements,
      positionElementsIfNeeded,
      hideElementsIfNeeded,
    }),
    [moveElements, positionElementsIfNeeded, hideElementsIfNeeded],
  )

  useEffect(() => {
    isReady.current = true
  }, [])

  return (
    <group>
      {Array.from({ length: MAX_RING_INSTANCES }).map((_, index) => (
        <RigidBody
          key={`ring-slot-${index}`}
          ref={(body) => {
            rigidBodies.current[index] = body
          }}
          type="fixed"
          canSleep={false}
          position={HIDDEN_POSITION}
          colliders={false}
          friction={0}
          restitution={0}>
          <BallCollider args={[RING_MAJOR_RADIUS + RING_TUBE_RADIUS * 0.5]} sensor={true} />
          <mesh>
            <torusGeometry args={[RING_MAJOR_RADIUS, RING_TUBE_RADIUS, 16, 32]} />
            <meshStandardMaterial
              color={RING_COLOR}
              emissive={RING_EMISSIVE}
              emissiveIntensity={0.4}
              metalness={0.6}
              roughness={0.25}
            />
          </mesh>
        </RigidBody>
      ))}
    </group>
  )
}

export default RingElements
