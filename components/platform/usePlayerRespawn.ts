import { type RefObject, useEffect } from 'react'

import { PLAYER_INITIAL_POSITION, useGameStore } from '@/components/GameProvider'
import {
  colToX,
  COLUMNS,
  EPSILON,
  type RowData,
  ROWS_RENDERED,
  SAFE_HEIGHT,
} from '@/utils/tiles'

const INVALID_ROW_INDEX = 10000
const CENTER_COL_INDEX = Math.floor(COLUMNS / 2)

type UsePlayerRespawnProps = {
  activeRowsData: RefObject<RowData[]>
  rowZByIndex: RefObject<number[]>
  currentScrollPosition: RefObject<number>
  onRespawnCalculated: (targetScroll: number, safeX: number) => void
}

function findSafeColumnX(row: RowData): number | null {
  // Check center first
  if (row.heights[CENTER_COL_INDEX] >= SAFE_HEIGHT - EPSILON.TINY) {
    return colToX(CENTER_COL_INDEX)
  }

  // Expand search
  for (let offset = 1; offset <= Math.floor(COLUMNS / 2); offset++) {
    // Check left
    const leftIndex = CENTER_COL_INDEX - offset
    if (
      leftIndex >= 0 &&
      row.heights[leftIndex] >= SAFE_HEIGHT - EPSILON.TINY
    ) {
      return colToX(leftIndex)
    }
    // Check right
    const rightIndex = CENTER_COL_INDEX + offset
    if (
      rightIndex < COLUMNS &&
      row.heights[rightIndex] >= SAFE_HEIGHT - EPSILON.TINY
    ) {
      return colToX(rightIndex)
    }
  }

  return null
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

function getBestSafeRowIndex(
  activeRowsData: RowData[],
  rowZByIndex: number[],
  playerZ: number,
): number {
  let bestSlotIndex = -1
  let minDistance = Infinity

  for (let i = 0; i < ROWS_RENDERED; i++) {
    const row = activeRowsData[i]
    if (!row || (row.rowIndex ?? INVALID_ROW_INDEX) >= INVALID_ROW_INDEX) continue

    // Must have at least one safe column
    if (findSafeColumnX(row) === null) continue

    const currentZ = rowZByIndex[i]
    if (typeof currentZ !== 'number') continue

    const dist = Math.abs(currentZ - playerZ)

    if (dist < minDistance) {
      minDistance = dist
      bestSlotIndex = i
    }
  }

  return bestSlotIndex
}

export function usePlayerRespawn({
  activeRowsData,
  rowZByIndex,
  currentScrollPosition,
  onRespawnCalculated,
}: UsePlayerRespawnProps) {
  const respawnPlayerTick = useGameStore((s) => s.respawnPlayerTick)

  useEffect(() => {
    if (respawnPlayerTick === 0) return

    const rows = activeRowsData.current
    const zValues = rowZByIndex.current
    const scrollPos = currentScrollPosition.current

    if (!rows || !zValues) return

    const playerZ = PLAYER_INITIAL_POSITION[2]

    // 1. Try to find the closest row (current row)
    const closestRowIndex = getClosestRowIndex(zValues, playerZ)
    
    if (closestRowIndex !== -1) {
      const row = rows[closestRowIndex]
      if (row && (row.rowIndex ?? INVALID_ROW_INDEX) < INVALID_ROW_INDEX) {
        const safeX = findSafeColumnX(row)
        if (safeX !== null) {
          // Current row is safe! No need to scroll.
          if (process.env.NODE_ENV !== 'production') {
            console.log('[Platform] Respawn: Current row is safe. Snapping to X only.', {
              closestRowIndex,
              safeX,
            })
          }
          onRespawnCalculated(scrollPos, safeX)
          return
        }
      }
    }

    // 2. Current row is not safe (or invalid). Find the nearest safe row.
    const bestSlotIndex = getBestSafeRowIndex(rows, zValues, playerZ)

    if (bestSlotIndex === -1) {
      console.warn('[Platform] Respawn: No valid safe row found in active set to snap to.')
      // Fallback to current position
      onRespawnCalculated(scrollPos, 0)
      return
    }

    const currentZ = zValues[bestSlotIndex]
    const targetZ = playerZ
    const diff = targetZ - currentZ
    const row = rows[bestSlotIndex]
    const safeX = findSafeColumnX(row) ?? 0 // Should not be null if getBestSafeRowIndex picked it
    const targetScroll = scrollPos + diff

    if (process.env.NODE_ENV !== 'production') {
      console.log('[Platform] Respawn: Snapping to new row', {
        bestSlotIndex,
        rowIndex: row?.rowIndex,
        currentZ,
        diff,
        safeX,
      })
    }

    onRespawnCalculated(targetScroll, safeX)
  }, [
    respawnPlayerTick,
    activeRowsData,
    rowZByIndex,
    currentScrollPosition,
    onRespawnCalculated,
  ])
}
