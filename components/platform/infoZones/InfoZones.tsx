import {
  type FC,
  type RefObject,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react'

import infoIcon from '@/assets/icons/info-icon.png'
import timerIcon from '@/assets/icons/timer-icon.png'
import trophyIcon from '@/assets/icons/trophy-icon.png'
import { useGameStore } from '@/components/GameProvider'
import { InfoZone, type InfoZoneProps } from '@/components/platform/infoZones/infoZone/InfoZone'
import useDynamicRigidBodies from '@/components/platform/useDynamicRigidBodies'
import Card from '@/components/ui/Card'
import {
  LeaderboardTable,
  useLeaderboardTableData,
} from '@/components/ui/speedRun/LeaderboardTable'
import { useTotalTime } from '@/hooks/useTime'
import { INFO_ZONE_SPHERE_COLOURS } from '@/resources/colours'
import { INFO_ZONES_CARD_CONTENT } from '@/resources/content'
import { type RowData } from '@/utils/tiles'

export type InfoZonesHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData) => void
}

type Props = {
  ref: RefObject<InfoZonesHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const InfoZones: FC<Props> = ({ ref, onReadyChange }) => {
  const totalCount = useGameStore((s) => s.totalCounts.infoZones)

  const { refs, isVisibleStates, translation, applyPlacement, hideRigidBodyAtIndex } =
    useDynamicRigidBodies(totalCount)

  const positionElementsIfNeeded = useCallback(
    (row: RowData, rowZ: number) => {
      if (!row.infoZonePlacements?.length) return
      row.infoZonePlacements.forEach((placement) => {
        applyPlacement(placement, rowZ)
      })
    },
    [applyPlacement],
  )

  const hideElementsIfNeeded = useCallback(
    (row: RowData) => {
      const placements = row.infoZonePlacements
      if (!placements?.length) return
      placements.forEach((placement) => {
        const contentIndex = placement[3]
        if (contentIndex == null) return
        hideRigidBodyAtIndex(contentIndex)
      })
    },
    [hideRigidBodyAtIndex],
  )

  const moveElements = useCallback(
    (zStep: number) => {
      if (zStep === 0) return
      isVisibleStates.forEach((isVisible, index) => {
        if (!isVisible) return
        const body = refs[index]
        if (!body?.current) return
        const currentPosition = body.current.translation()
        translation.current.x = currentPosition.x
        translation.current.y = currentPosition.y
        translation.current.z = currentPosition.z + zStep
        body.current.setTranslation(translation.current, true)
      })
    },
    [isVisibleStates, refs, translation],
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

  const tableData = useLeaderboardTableData({
    count: 5,
    fetchPlayerRecentPosition: false,
    showCTARow: true,
  })

  const timeContainer = useRef<HTMLDivElement | null>(null)

  const onTimeChange = useCallback(
    (elapsedSeconds: number) => {
      if (!isVisibleStates[3]) return
      if (!timeContainer.current) return
      timeContainer.current.textContent = formatTotalTime(elapsedSeconds)
    },
    [isVisibleStates],
  )

  const totalTime = useTotalTime(onTimeChange)
  const startSpeedRun = useGameStore((s) => s.startSpeedRun)

  // Has to be inside to access the store hooks.
  function getContentForPlacementIndex(placementIndex: number) {
    if (placementIndex === 3)
      return <TotalTimeDisplay initialValue={totalTime} timeContainer={timeContainer} />
    if (placementIndex === 4)
      return <LeaderboardTable {...tableData} onStartSpeedRun={startSpeedRun} />
    return INFO_ZONES_CARD_CONTENT[placementIndex]
  }

  return (
    <>
      {refs.map((ref, index) => {
        return (
          <InfoZone
            key={`info-zone-${index}`}
            ref={ref}
            isVisible={isVisibleStates[index]}
            {...getInfoZonePropsForIndex(index)}>
            {getContentForPlacementIndex(index)}
          </InfoZone>
        )
      })}
    </>
  )
}

export default InfoZones

function getInfoZonePropsForIndex(
  placementIndex: number,
): Pick<
  InfoZoneProps,
  | 'infoContainerClassName'
  | 'iconSrc'
  | 'infoContentHtmlProps'
  | 'infoPositionOffset'
  | 'sphereColour'
> {
  if (placementIndex === 3) {
    // Total time display
    return {
      infoContainerClassName: 'w-[280px] sm:w-[320px]',
      iconSrc: timerIcon.src,
      infoPositionOffset: [0, 6, 4],
      infoContentHtmlProps: { transform: true },
      sphereColour: INFO_ZONE_SPHERE_COLOURS[placementIndex],
    }
  }
  if (placementIndex === 4) {
    // Leaderboard
    return {
      infoContainerClassName: 'w-[328px] sm:w-[450px]',
      iconSrc: trophyIcon.src,
      infoPositionOffset: [0, 10, 5],
      sphereColour: INFO_ZONE_SPHERE_COLOURS[placementIndex],
    }
  }
  // Info Content
  return {
    infoContainerClassName: 'w-[328px] lg:w-180',
    iconSrc: infoIcon.src,
    sphereColour: INFO_ZONE_SPHERE_COLOURS[placementIndex],
  }
}

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

type TotalTimeDisplayProps = {
  initialValue: RefObject<number>
  timeContainer: RefObject<HTMLDivElement | null>
}

const TotalTimeDisplay: FC<TotalTimeDisplayProps> = ({ initialValue, timeContainer }) => {
  return (
    <section className="relative flex flex-col items-center justify-center gap-3 py-5 text-center">
      <div>
        <p className="text-sm font-medium text-white/80">TOTAL TIME</p>
        <div ref={timeContainer} aria-live="polite" className="text-5xl font-bold sm:text-6xl">
          {formatTotalTime(initialValue.current ?? 0)}
        </div>
      </div>

      <div className="h-px w-40 bg-white/20" />

      <div>
        <p className="text-sm font-medium text-white/80">AVERAGE TIME ON A WEBSITE</p>
        <p className="text-3xl font-bold">00:53</p>
      </div>
    </section>
  )
}
