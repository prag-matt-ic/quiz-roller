import {
  type FC,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
  createRef,
} from 'react'
import { RapierRigidBody } from '@react-three/rapier'

import {
  HIDE_POSITION_Y,
  HIDE_POSITION_Z,
  type IndexedPlacement,
  type RowData,
} from '@/utils/tiles'
import { INFO_ZONE_HEIGHT, INFO_ZONE_WIDTH } from '@/utils/platform/infoZoneDimensions'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { useGameStore } from '../GameProvider'
import Card from '@/components/ui/Card'
import {
  LeaderboardTable,
  useLeaderboardTableData,
} from '@/components/ui/speedRun/LeaderboardTable'
import useTime from '@/hooks/useTime'

const INITIAL_POSITION: [number, number, number] = [0, HIDE_POSITION_Y, HIDE_POSITION_Z]

export type InfoZonesHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Assignment = {
  rowIndex: number | null
  placementIndex: number | null
}

type Props = {
  ref: RefObject<InfoZonesHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const createRefsFromCount = (count: number): RefObject<RapierRigidBody | null>[] => {
  return Array.from({ length: count }, () => createRef<RapierRigidBody | null>())
}

const createIsVisibleStatesFromCount = (count: number): boolean[] => {
  return Array.from({ length: count }, () => false)
}

const createAssignmentsFromCount = (count: number): Assignment[] => {
  return Array.from({ length: count }, () => ({ rowIndex: null, placementIndex: null }))
}

const InfoZones: FC<Props> = ({ ref, onReadyChange }) => {
  const totalCount = useGameStore((s) => s.totalCounts.infoZones)
  const [refs, setRefs] = useState(() => createRefsFromCount(totalCount))
  const [isVisibleStates, setIsVisibleStates] = useState<boolean[]>(() =>
    createIsVisibleStatesFromCount(totalCount),
  )
  const assignments = useRef<Assignment[]>(createAssignmentsFromCount(totalCount))

  useEffect(() => {
    console.log('[InfoZones] Adjusting pool size to', totalCount)
    if (assignments.current.length === totalCount) return
    assignments.current = createAssignmentsFromCount(totalCount)
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsVisibleStates(createIsVisibleStatesFromCount(totalCount))
    setRefs(createRefsFromCount(totalCount))
  }, [totalCount])

  const translation = useRef({ x: 0, y: 0, z: 0 })

  const setIsVisibleState = useCallback(
    (index: number, value: boolean) => {
      setIsVisibleStates((prev) => {
        if (prev[index] === value) return prev
        const next = [...prev]
        next[index] = value
        return next
      })
    },
    [setIsVisibleStates],
  )

  const setPosition = useCallback(
    (index: number, x: number, y: number, z: number) => {
      const body = refs[index]
      if (!body?.current) {
        console.warn('[InfoZones] Missing rigid body ref for index', index)
        return false
      }
      translation.current.x = x
      translation.current.y = y
      translation.current.z = z
      body.current.setTranslation(translation.current, true)
      return true
    },
    [refs, translation],
  )

  const hideAtIndex = useCallback(
    (index: number) => {
      setPosition(index, INITIAL_POSITION[0], INITIAL_POSITION[1], INITIAL_POSITION[2])
      assignments.current[index] = { rowIndex: null, placementIndex: null }
      setIsVisibleState(index, false)
    },
    [assignments, setPosition, setIsVisibleState],
  )

  const ensurePlacement = useCallback(
    (rowIndex: number, placementIndex: number, rowZ: number, placement: IndexedPlacement) => {
      const [x, y, relativeZ, contentIndex] = placement
      if (contentIndex < 0 || contentIndex >= refs.length) {
        console.warn('[InfoZones] No available zone for placement', {
          rowIndex,
          placementIndex,
          contentIndex,
          poolSize: refs.length,
          placement,
        })
        return
      }
      const assignment = assignments.current[contentIndex]
      if (assignment?.rowIndex === rowIndex && assignment.placementIndex === placementIndex)
        return
      const targetZ = rowZ + relativeZ

      if (!setPosition(contentIndex, x, y, targetZ)) return

      assignments.current[contentIndex] = { rowIndex, placementIndex }
      setIsVisibleState(contentIndex, true)
    },
    [assignments, refs.length, setPosition, setIsVisibleState],
  )

  const releaseUnusedPlacements = useCallback(
    (rowIndex: number, placementCount: number) => {
      assignments.current.forEach((assignment, index) => {
        if (assignment.rowIndex !== rowIndex) return
        if (assignment.placementIndex != null && assignment.placementIndex < placementCount)
          return
        hideAtIndex(index)
      })
    },
    [assignments, hideAtIndex],
  )

  const positionElementsIfNeeded = useCallback(
    (row: RowData | undefined, rowZ: number) => {
      if (!row?.infoZonePlacements?.length) return

      const rowIndex = row.rowIndex ?? -1
      if (rowIndex < 0) return

      row.infoZonePlacements.forEach((placement, placementIndex) => {
        ensurePlacement(rowIndex, placementIndex, rowZ, placement)
      })
      releaseUnusedPlacements(rowIndex, row.infoZonePlacements.length)
    },
    [ensurePlacement, releaseUnusedPlacements],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData | undefined) => {
      if (!row || row.rowIndex == null) return
      assignments.current.forEach((assignment, index) => {
        if (assignment.rowIndex !== row.rowIndex) return
        hideAtIndex(index)
      })
    },
    [assignments, hideAtIndex],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (zStep === 0) return
      assignments.current.forEach((assignment, index) => {
        if (assignment.rowIndex == null) return
        const body = refs[index]
        if (!body?.current) return
        const currentPosition = body.current.translation()
        translation.current.x = currentPosition.x
        translation.current.y = currentPosition.y
        translation.current.z = currentPosition.z + zStep
        body.current.setTranslation(translation.current, true)
      })
    },
    [assignments, refs, translation],
  )

  useImperativeHandle(
    ref,
    () => ({
      moveElements,
      positionElementsIfNeeded,
      hideElementsIfNeeded,
    }),
    [hideElementsIfNeeded, moveElements, positionElementsIfNeeded],
  )

  useEffect(() => {
    onReadyChange(true)
    return () => {
      onReadyChange(false)
    }
  }, [onReadyChange])

  return (
    <>
      {refs.map((ref, index) => {
        return (
          <InfoZone
            key={`info-zone-${index}`}
            ref={ref}
            position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
            width={INFO_ZONE_WIDTH}
            height={INFO_ZONE_HEIGHT}
            infoContainerClassName={getInfoContainerClassNameForPlacementIndex(index)}
            isVisible={isVisibleStates[index]}>
            {getContentForPlacementIndex(index)}
          </InfoZone>
        )
      })}
    </>
  )
}

export default InfoZones

function getInfoContainerClassNameForPlacementIndex(placementIndex: number): string {
  if (placementIndex < 3) return 'grid w-[328px] sm:w-160 grid-cols-1 gap-3'
  return 'w-[328px] sm:w-[450px]'
}

function getContentForPlacementIndex(placementIndex: number) {
  if (placementIndex === 0)
    return (
      <Card className="w-full">
        <h2 className="info-header">About</h2>
        <p className="paragraph-sm max-w-md">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </Card>
    )

  if (placementIndex === 1)
    return (
      <Card className="w-full">
        <h2 className="info-header">Placeholder 1</h2>
        <p className="paragraph-sm max-w-md">
          This experience is built using React Three Fiber, Rapier physics and WebGL for
          immersive graphics.
        </p>
      </Card>
    )

  if (placementIndex === 2)
    return (
      <Card className="w-full">
        <h2 className="info-header">Placeholder 2</h2>
        <p className="paragraph-sm max-w-md">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
          incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
          exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
        </p>
      </Card>
    )

  if (placementIndex === 3) return <TotalTimeDisplay />
  if (placementIndex === 4) return <LeaderboardTableWrapper />

  return null
}

const TotalTimeDisplay: FC = () => {
  const totalTimeContainer = useRef<HTMLDivElement>(null)

  const pad = (value: number): string => value.toString().padStart(2, '0')

  const formatTotalTime = (elapsedSeconds: number): string => {
    const totalSeconds = Math.floor(elapsedSeconds)
    const hours = Math.floor(totalSeconds / 3600)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    if (hours > 0) {
      const remainingMinutes = minutes % 60
      return `${pad(hours)}:${pad(remainingMinutes)}:${pad(seconds)}`
    }
    return `${pad(minutes)}:${pad(seconds)}`
  }

  const { totalTime } = useTime((elapsedSeconds: number) => {
    if (!totalTimeContainer.current) return
    totalTimeContainer.current.textContent = formatTotalTime(elapsedSeconds)
  })

  return (
    <section className="relative flex flex-col items-center justify-center gap-3 py-5 text-center">
      <div>
        <p className="text-sm font-medium text-white/80">TOTAL TIME</p>
        <div ref={totalTimeContainer} aria-live="polite" className="text-5xl font-bold">
          {formatTotalTime(totalTime.current)}
        </div>
      </div>

      <div className="h-px w-40 bg-white/20" />

      <div>
        <p className="text-sm font-medium text-white/80">AVERAGE TIME ON A WEBSITE</p>
        <p className="text-3xl font-bold">00:53</p>
      </div>

      <div className="h-px w-40 bg-white/20" />

      <p>Ready to take the next step?</p>
      <button>Book an intro call</button>
    </section>
  )
}

const LeaderboardTableWrapper: FC = () => {
  const tableData = useLeaderboardTableData(5, false)
  return <LeaderboardTable {...tableData} />
}
