import Image from 'next/image'
import { type FC, useEffect, useRef } from 'react'
import { twJoin } from 'tailwind-merge'

import { useGameStore, useGameStoreAPI } from '@/components/GameProvider'
import { EMPTY_ROW_INDEX } from '@/components/platform/usePlayerRespawn'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import { PLATFORM_VERSION } from '@/resources/rowsData'
import { GameMode, InputType } from '@/stores/types'
import { COLUMNS, TILE_SIZE } from '@/utils/tiles'

const MINI_MAP_ASSET_BASE = `/maps/${PLATFORM_VERSION}`
const MINI_MAP_ASSET_PATHS: Record<GameMode, string> = {
  [GameMode.LEARN]: `${MINI_MAP_ASSET_BASE}/learn.svg`,
  [GameMode.SPEEDRUN]: `${MINI_MAP_ASSET_BASE}/speedrun.svg`,
  [GameMode.DEV]: `${MINI_MAP_ASSET_BASE}/dev.svg`,
}

const PLAYER_SIZE_PX = 8
const PLAYER_INDICATOR_Y_OFFSET_PX = PLAYER_SIZE_PX * 8
const MAP_TILE_SIZE_PX = 4
const PROGRESS_PADDING_ROWS = 5

type ProgressWindow = {
  maxRowIndex: number
  progressStartRow: number
  progressRange: number
}

const getProgressWindow = (totalRows: number): ProgressWindow => {
  const maxRowIndex = Math.max(0, totalRows - 1)
  const hasFullPadding = maxRowIndex + 1 > PROGRESS_PADDING_ROWS * 2
  const progressStartRow = hasFullPadding ? PROGRESS_PADDING_ROWS : 0
  const progressEndRow = hasFullPadding ? maxRowIndex - PROGRESS_PADDING_ROWS + 1 : maxRowIndex
  return {
    maxRowIndex,
    progressStartRow,
    progressRange: Math.max(1, progressEndRow - progressStartRow),
  }
}

type Props = {
  isMobile: boolean
}

const MiniMap: FC<Props> = ({ isMobile }) => {
  const mode = useGameStore((s) => s.mode)
  const totalRows = useGameStore((s) => s.totalCounts.rows)
  const gameStoreAPI = useGameStoreAPI()

  const isUsingJoystick = useGameStore((s) => s.inputType === InputType.JOYSTICK)
  const joystickIsOnLeft = useGameStore((s) => s.joystickPosition === 'left')
  const isMapOnRight = isUsingJoystick && joystickIsOnLeft

  const {
    maxRowIndex: initialMaxRowIndex,
    progressStartRow: initialProgressStartRow,
    progressRange: initialProgressRange,
  } = getProgressWindow(totalRows)

  const totalRowsRef = useRef(totalRows)
  const rowsToPixelsRef = useRef(
    totalRows === 0 ? 0 : (MAP_TILE_SIZE_PX * totalRows) / Math.max(1, initialMaxRowIndex),
  )
  const maxRowIndexRef = useRef(initialMaxRowIndex)
  const progressStartRowRef = useRef(initialProgressStartRow)
  const progressRangeRef = useRef(initialProgressRange)
  const miniMapAsset = MINI_MAP_ASSET_PATHS[mode] ?? MINI_MAP_ASSET_PATHS[GameMode.LEARN]

  const progressRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<HTMLImageElement | null>(null)

  useEffect(() => {
    totalRowsRef.current = totalRows
    const { maxRowIndex, progressRange, progressStartRow } = getProgressWindow(totalRows)
    maxRowIndexRef.current = maxRowIndex
    const denominator = Math.max(1, maxRowIndex)
    rowsToPixelsRef.current = totalRows === 0 ? 0 : (MAP_TILE_SIZE_PX * totalRows) / denominator
    progressStartRowRef.current = progressStartRow
    progressRangeRef.current = progressRange
  }, [totalRows])

  const { playerPosition } = usePlayerPosition()

  useEffect(() => {
    let currentRow = 3
    let lastXRef = 0
    let lastYRef = 0

    const updateProgress = (row: number) => {
      if (row === EMPTY_ROW_INDEX) return // fallen off front or back of the platform
      if (!progressRef.current) return
      const rowsProgress = Math.min(
        1,
        Math.max(0, (row - progressStartRowRef.current) / progressRangeRef.current),
      )
      progressRef.current.style.clipPath = `inset(${100 - rowsProgress * 100}% 0 0 0)`
    }

    const updateMapTransform = (row: number, playerX: number) => {
      if (!mapRef.current) return
      if (row === EMPTY_ROW_INDEX) return

      const clampedRow = Math.min(maxRowIndexRef.current, Math.max(0, row))
      const translateY = clampedRow * rowsToPixelsRef.current - PLAYER_INDICATOR_Y_OFFSET_PX
      const xPositionInTileUnits = playerX / TILE_SIZE
      const translateX = -xPositionInTileUnits * MAP_TILE_SIZE_PX

      if (translateX === lastXRef && translateY === lastYRef) return
      lastXRef = translateX
      lastYRef = translateY

      mapRef.current.style.transform = `translate3d(${translateX}px, ${translateY}px, 0)`
    }

    let animationFrameId: number

    const loop = () => {
      updateMapTransform(currentRow, playerPosition.current[0])
      updateProgress(currentRow)
      animationFrameId = requestAnimationFrame(loop)
    }

    loop()

    const unsubscribe = gameStoreAPI.subscribe(
      (s) => s.currentRow,
      (newCurrentRow) => {
        currentRow = newCurrentRow
      },
    )

    return () => {
      unsubscribe()
      cancelAnimationFrame(animationFrameId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStoreAPI])

  return (
    <aside
      id="mini-map"
      className={twJoin(
        'pointer-events-none fixed bottom-3 z-5 flex items-center justify-center overflow-hidden rounded-full bg-black/85',
        isMapOnRight ? 'right-3' : 'left-3',
      )}
      style={{
        width: COLUMNS * MAP_TILE_SIZE_PX,
        height: COLUMNS * MAP_TILE_SIZE_PX,
      }}>
      <Image
        src={miniMapAsset}
        ref={mapRef}
        alt="Mini Map"
        width={MAP_TILE_SIZE_PX * COLUMNS}
        height={MAP_TILE_SIZE_PX * totalRows}
        className="absolute bottom-0 transition-transform duration-100 ease-linear will-change-transform"
        style={{
          transform: 'translate3d(0,0,0)',
        }}
      />
      <div
        id="mini-map-player"
        className="absolute z-20 rounded-full bg-white"
        style={{
          bottom: PLAYER_INDICATOR_Y_OFFSET_PX - PLAYER_SIZE_PX / 2,
          width: PLAYER_SIZE_PX,
          height: PLAYER_SIZE_PX,
        }}
      />
      <div
        ref={progressRef}
        className="absolute inset-0 size-full rounded-full border-2 border-teal-300 bg-none"
        style={{
          clipPath: 'inset(100% 0 0 0)',
        }}
      />
    </aside>
  )
}

export default MiniMap
