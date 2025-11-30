import { type RefObject, useCallback, useRef } from 'react'

import { PLAYER_INITIAL_POSITION, useGameStore } from '@/components/GameProvider'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import usePlayerStatus from '@/hooks/usePlayerStatus'
import { PlayerStatus } from '@/stores/types'
import {
  COLUMNS,
  EPSILON,
  ROWS_RENDERED,
  type RowData,
  SAFE_HEIGHT,
  TILE_SIZE,
  colToX,
} from '@/utils/tiles'

export const EMPTY_ROW_INDEX = 10000
const CENTER_COL_INDEX = Math.floor(COLUMNS / 2)
const UNSAFE_ROW_SHIFT = 1
const MIN_RESPAWN_ABSOLUTE_ROW = UNSAFE_ROW_SHIFT

type SafeRowSelection = {
  rowIndex: number
  safeX: number
  rowZ: number
  absoluteRowIndex: number
}

/**
 * Optimized to find the safe column closest to preferredX without iterating all columns.
 * It calculates the target column index and expands outwards.
 */
function findSafeColumnX(row: RowData, preferredX: number): number | null {
  const fallbackX = colToX(CENTER_COL_INDEX)
  const targetX = Number.isFinite(preferredX) ? preferredX : fallbackX

  // Calculate the column index closest to the target X
  // col = (x / size) + (columns / 2) - 0.5
  const rawColIndex = targetX / TILE_SIZE + COLUMNS / 2 - 0.5
  const startColIndex = Math.max(0, Math.min(COLUMNS - 1, Math.round(rawColIndex)))

  // Check the target column first
  if (row.heights[startColIndex] >= SAFE_HEIGHT - EPSILON.TINY) {
    return colToX(startColIndex)
  }

  // Expand outwards: check left and right neighbors
  let offset = 1
  while (true) {
    const leftIndex = startColIndex - offset
    const rightIndex = startColIndex + offset

    // If both are out of bounds, no safe column exists
    if (leftIndex < 0 && rightIndex >= COLUMNS) {
      return null
    }

    // Check left
    if (leftIndex >= 0) {
      if (row.heights[leftIndex] >= SAFE_HEIGHT - EPSILON.TINY) {
        return colToX(leftIndex)
      }
    }

    // Check right
    if (rightIndex < COLUMNS) {
      if (row.heights[rightIndex] >= SAFE_HEIGHT - EPSILON.TINY) {
        return colToX(rightIndex)
      }
    }

    offset++
  }
}

function getClosestRowIndex(rowZByIndex: number[], playerZ: number): number {
  let bestIndex = -1
  let minDistance = Infinity

  for (let i = 0; i < ROWS_RENDERED; i++) {
    const currentZ = rowZByIndex[i]
    if (typeof currentZ !== 'number') continue
    const dist = Math.abs(currentZ - playerZ)
    if (dist < minDistance) {
      minDistance = dist
      bestIndex = i
    }
  }
  return bestIndex
}

function selectSafeRow(
  rows: RowData[],
  zValues: number[],
  rowIndex: number,
  preferredX: number,
): SafeRowSelection | null {
  if (rowIndex < 0 || rowIndex >= ROWS_RENDERED) return null
  const row = rows[rowIndex]
  if (!row || (row.rowIndex ?? EMPTY_ROW_INDEX) >= EMPTY_ROW_INDEX) return null

  const safeX = findSafeColumnX(row, preferredX)
  if (safeX === null) return null

  const rowZ = zValues[rowIndex]
  if (typeof rowZ !== 'number') return null

  const absoluteRowIndex = row.rowIndex ?? EMPTY_ROW_INDEX
  return { rowIndex, safeX, rowZ, absoluteRowIndex }
}

function findSlotIndexForRow(rows: RowData[], targetRowIndex: number): number {
  if (!Number.isFinite(targetRowIndex)) return -1
  for (let i = 0; i < ROWS_RENDERED; i++) {
    const row = rows[i]
    if (!row) continue
    if (row.rowIndex === targetRowIndex) return i
  }
  return -1
}

function selectRowByAbsoluteIndex(
  rows: RowData[],
  zValues: number[],
  absoluteRowIndex: number,
  preferredX: number,
): SafeRowSelection | null {
  const slotIndex = findSlotIndexForRow(rows, absoluteRowIndex)
  if (slotIndex === -1) return null
  return selectSafeRow(rows, zValues, slotIndex, preferredX)
}

function ensureMinimumRowSelection(
  selection: SafeRowSelection | null,
  rows: RowData[],
  zValues: number[],
  preferredX: number,
): SafeRowSelection | null {
  if (!selection) return null
  if (selection.absoluteRowIndex >= MIN_RESPAWN_ABSOLUTE_ROW) return selection
  const offsetSelection = selectRowByAbsoluteIndex(
    rows,
    zValues,
    selection.absoluteRowIndex + UNSAFE_ROW_SHIFT,
    preferredX,
  )
  return offsetSelection ?? selection
}

function getBestSafeRowSelection(
  rows: RowData[],
  zValues: number[],
  playerZ: number,
  preferredX: number,
): SafeRowSelection | null {
  let bestSelection: SafeRowSelection | null = null
  let minDistance = Infinity

  for (let i = 0; i < ROWS_RENDERED; i++) {
    const selection = selectSafeRow(rows, zValues, i, preferredX)
    if (!selection) continue
    const distance = Math.abs(selection.rowZ - playerZ)
    if (distance < minDistance) {
      minDistance = distance
      bestSelection = selection
    }
  }

  return bestSelection
}

export function usePlayerRespawn({
  activeRowsData,
  rowZByIndex,
  currentScrollPosition,
  isPlatformReady,
}: {
  activeRowsData: RefObject<RowData[]>
  rowZByIndex: RefObject<number[]>
  currentScrollPosition: RefObject<number>
  isPlatformReady: boolean
}) {
  const respawnPlayer = useGameStore((s) => s.respawnPlayer)
  const targetScrollPosition = useRef<number | null>(null)
  const pendingRespawnX = useRef<number | null>(null)
  const preferredRespawnX = useRef(PLAYER_INITIAL_POSITION[0])

  usePlayerPosition((pos) => {
    preferredRespawnX.current = pos[0]
  })

  const onOutOfBounds = () => {
    console.warn('[Platform] Player out-of-bounds detected, initiating respawn sequence.')
    const rows = activeRowsData.current
    const zValues = rowZByIndex.current
    const scrollPos = currentScrollPosition.current

    if (!rows || !zValues) return

    targetScrollPosition.current = null
    pendingRespawnX.current = null

    const playerZ = PLAYER_INITIAL_POSITION[2]
    const preferredX = preferredRespawnX.current

    // 1. Try to find the closest row (current row)
    const closestRowIndex = getClosestRowIndex(zValues, playerZ)

    const queueRespawn = (
      selection: SafeRowSelection,
      reason: string,
      extra?: Record<string, unknown>,
    ) => {
      const diff = playerZ - selection.rowZ
      const targetScroll = scrollPos + diff
      if (process.env.NODE_ENV !== 'production') {
        console.warn(`[Platform] Respawn: ${reason}`, {
          slotIndex: selection.rowIndex,
          rowIndex: selection.absoluteRowIndex,
          rowZ: selection.rowZ,
          diff,
          safeX: selection.safeX,
          targetScroll,
          ...extra,
        })
      }
      targetScrollPosition.current = targetScroll
      pendingRespawnX.current = selection.safeX
    }

    if (closestRowIndex !== -1) {
      const currentRowSelection = ensureMinimumRowSelection(
        selectSafeRow(rows, zValues, closestRowIndex, preferredX),
        rows,
        zValues,
        preferredX,
      )
      if (currentRowSelection) {
        queueRespawn(currentRowSelection, 'Current row is safe. Snapping to X only.')
        return
      }

      const shiftedSelection = selectSafeRow(
        rows,
        zValues,
        findSlotIndexForRow(
          rows,
          (rows[closestRowIndex]?.rowIndex ?? EMPTY_ROW_INDEX) + UNSAFE_ROW_SHIFT,
        ),
        preferredX,
      )

      if (shiftedSelection) {
        queueRespawn(shiftedSelection, 'Current row unsafe, shifting forward.', {
          originalSlotIndex: closestRowIndex,
        })
        return
      }
    }

    // 2. Current row is not safe (or invalid). Find the nearest safe row.
    // We scan all rows to ensure we find the spatially closest one,
    // rather than relying on index proximity which might be misleading in a ring buffer.
    const bestSelection = ensureMinimumRowSelection(
      getBestSafeRowSelection(rows, zValues, playerZ, preferredX),
      rows,
      zValues,
      preferredX,
    )

    if (!bestSelection) {
      console.warn('[Platform] Respawn: No valid safe row found in active set to snap to.')
      // Fallback to current position
      targetScrollPosition.current = scrollPos
      pendingRespawnX.current = 0
      return
    }

    queueRespawn(bestSelection, 'Snapping to nearest safe row')
  }

  const onPlayerStatusChange = (playerStatus: PlayerStatus) => {
    if (!isPlatformReady) return
    if (playerStatus === 'out-of-bounds') onOutOfBounds()
  }

  usePlayerStatus(onPlayerStatusChange)

  const onRespawnScrollComplete = useCallback(() => {
    targetScrollPosition.current = null
    if (pendingRespawnX.current === null) return
    respawnPlayer([
      pendingRespawnX.current,
      PLAYER_INITIAL_POSITION[1],
      PLAYER_INITIAL_POSITION[2],
    ])
    pendingRespawnX.current = null
  }, [respawnPlayer])

  return { targetScrollPosition, onRespawnScrollComplete }
}
