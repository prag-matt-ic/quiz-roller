import { RapierRigidBody } from '@react-three/rapier'
import {
  type FC,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type RefObject,
  useState,
} from 'react'

import { CTA_ZONE_HEIGHT, CTA_ZONE_WIDTH } from '@/utils/platform/ctaSection'
import { HIDE_POSITION_Y, HIDE_POSITION_Z, type RowData } from '@/utils/tiles'
import { InfoZone } from '@/components/infoZone/InfoZone'
import { TrophyIcon } from 'lucide-react'
import { useTime } from '@/hooks/useTime'
import {
  LeaderboardTable,
  useLeaderboardTableData,
} from '@/components/ui/speedRun/LeaderboardTable'
import { useGameStore } from '@/components/GameProvider'

export type CTAElementsHandle = {
  moveElements: (zStep: number) => void
  positionElementsIfNeeded: (row: RowData | undefined, rowZ: number) => void
  hideElementsIfNeeded: (row: RowData | undefined) => void
}

type Props = {
  ref: RefObject<CTAElementsHandle | null>
  onReadyChange: (isReady: boolean) => void
}

const CTAElements: FC<Props> = ({ ref, onReadyChange }) => {
  const translation = useRef({ x: 0, y: 0, z: 0 })
  const leaderboardZone = useRef<RapierRigidBody>(null)
  const timeDisplayZone = useRef<RapierRigidBody>(null)
  const leaderboardRowIndex = useRef<number | null>(null)
  const timeDisplayRowIndex = useRef<number | null>(null)
  const [isLeaderboardPositioned, setLeaderboardPositioned] = useState(false)
  const [isTimeDisplayPositioned, setTimeDisplayPositioned] = useState(false)

  const positionElementsIfNeeded = useCallback((row: RowData | undefined, rowZ: number) => {
    if (!row) return
    if (row.type !== 'cta') return

    const absoluteRowIndex = row.rowIndex as number
    const infoZonePositions = row.infoZonePositions

    if (infoZonePositions && infoZonePositions.length >= 2) {
      const leaderboardPos = infoZonePositions[0]
      const timeDisplayPos = infoZonePositions[1]

      if (leaderboardPos && leaderboardZone.current) {
        if (leaderboardRowIndex.current !== absoluteRowIndex) {
          const newZ = rowZ + leaderboardPos[2]
          translation.current.x = leaderboardPos[0]
          translation.current.y = leaderboardPos[1]
          translation.current.z = newZ
          leaderboardZone.current.setTranslation(translation.current, true)
          leaderboardRowIndex.current = absoluteRowIndex
          setLeaderboardPositioned(true)
        }
      }

      if (timeDisplayPos && timeDisplayZone.current) {
        if (timeDisplayRowIndex.current !== absoluteRowIndex) {
          const newZ = rowZ + timeDisplayPos[2]
          translation.current.x = timeDisplayPos[0]
          translation.current.y = timeDisplayPos[1]
          translation.current.z = newZ
          timeDisplayZone.current.setTranslation(translation.current, true)
          timeDisplayRowIndex.current = absoluteRowIndex
          setTimeDisplayPositioned(true)
        }
      }
    }
  }, [])

  const hideElementsIfNeeded = useCallback((row: RowData | undefined) => {
    if (!row) return
    if (row.type !== 'cta') return

    const shouldHideZone = !!row.infoZonePositions

    if (shouldHideZone) {
      translation.current.x = 0
      translation.current.y = HIDE_POSITION_Y
      translation.current.z = HIDE_POSITION_Z

      if (leaderboardZone.current) {
        leaderboardZone.current.setTranslation(translation.current, true)
        leaderboardRowIndex.current = null
        setLeaderboardPositioned(false)
      }

      if (timeDisplayZone.current) {
        timeDisplayZone.current.setTranslation(translation.current, true)
        timeDisplayRowIndex.current = null
        setTimeDisplayPositioned(false)
      }
    }
  }, [])

  const moveElements = useCallback((zStep: number) => {
    if (leaderboardRowIndex.current != null && !!leaderboardZone.current) {
      const currentTranslation = leaderboardZone.current.translation()
      const newZ = currentTranslation.z + zStep
      translation.current.x = currentTranslation.x
      translation.current.y = currentTranslation.y
      translation.current.z = newZ
      leaderboardZone.current.setTranslation(translation.current, true)
    }

    if (timeDisplayRowIndex.current != null && !!timeDisplayZone.current) {
      const currentTranslation = timeDisplayZone.current.translation()
      const newZ = currentTranslation.z + zStep
      translation.current.x = currentTranslation.x
      translation.current.y = currentTranslation.y
      translation.current.z = newZ
      timeDisplayZone.current.setTranslation(translation.current, true)
    }
  }, [])

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

  const totalTimeContainer = useRef<HTMLDivElement>(null)

  const { totalTime } = useTime((elapsedSeconds: number) => {
    if (timeDisplayRowIndex.current == null) return
    if (!totalTimeContainer.current) return
    totalTimeContainer.current.textContent = formatTotalTime(elapsedSeconds)
  })

  const tableData = useLeaderboardTableData(5, false)

  const startSpeedRun = useGameStore((s) => s.startSpeedRun)

  return (
    <>
      <InfoZone
        key="cta-leaderboard"
        ref={leaderboardZone}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={CTA_ZONE_WIDTH}
        height={CTA_ZONE_HEIGHT}
        infoPositionOffset={[0, 12, 4]}
        infoContentHtmlProps={{ transform: true }}
        infoContainerClassName="w-[328px] sm:w-[450px]"
        isPositioned={isLeaderboardPositioned}
        Icon={TrophyIcon}>
        <LeaderboardTable {...tableData} />
        <button
          className="pointer-events-auto relative bg-white p-5 text-black"
          onClick={startSpeedRun}>
          Start Speedroll!
        </button>
      </InfoZone>

      <InfoZone
        key="cta-totaltime"
        ref={timeDisplayZone}
        position={[0, HIDE_POSITION_Y, HIDE_POSITION_Z]}
        width={CTA_ZONE_WIDTH}
        height={CTA_ZONE_HEIGHT}
        infoPositionOffset={[0, 8, 4]}
        alwaysShowInfo={true}
        infoContentHtmlProps={{ transform: true }}
        infoContainerClassName="w-[328px] sm:w-[450px]"
        isPositioned={isTimeDisplayPositioned}
        Icon={null}>
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
      </InfoZone>
    </>
  )
}

export default CTAElements

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
