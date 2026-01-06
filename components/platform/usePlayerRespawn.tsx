import { type RefObject, useRef } from 'react'

import { PLAYER_INITIAL_POSITION, useGameStore } from '@/components/GameProvider'
import { usePlayerPosition } from '@/hooks/usePlayerPosition'
import usePlayerStatus from '@/hooks/usePlayerStatus'
import { type PlayerStatus } from '@/stores/types'
import { COLUMNS, ROWS_RENDERED, type RowData, TILE_SIZE, colToX } from '@/utils/tiles'

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
  if ((row.isRaised[startColIndex] ?? 0) === 1) {
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
      if ((row.isRaised[leftIndex] ?? 0) === 1) {
        return colToX(leftIndex)
      }
    }

    // Check right
    if (rightIndex < COLUMNS) {
      if ((row.isRaised[rightIndex] ?? 0) === 1) {
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
    
    // Prefer rows behind the player (positive rowZ in visual space)
    // Add a small penalty for rows ahead to prefer rows behind
    const rawDistance = Math.abs(selection.rowZ - playerZ)
    const isBehindPlayer = selection.rowZ > playerZ
    const distance = isBehindPlayer ? rawDistance : rawDistance + 2.0
    
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
  const preferredRespawnX = useRef(PLAYER_INITIAL_POSITION[0])

  usePlayerPosition((pos) => {
    preferredRespawnX.current = pos[0]
  })

  const onOutOfBounds = () => {
    const rows = activeRowsData.current
    const zValues = rowZByIndex.current
    const scrollPos = currentScrollPosition.current

    if (!rows || !zValues) return

    // With ball movement, playerZ = -scrollPos (player position in world space)
    const playerZ = -scrollPos
    const preferredX = preferredRespawnX.current

    console.log('[Respawn] scrollPos:', scrollPos, 'playerZ:', playerZ, 'preferredX:', preferredX)
    console.log('[Respawn] zValues:', zValues.slice(0, 5), '...')

    // 1. Try to find the closest row (current row)
    const closestRowIndex = getClosestRowIndex(zValues, 0) // Rows are relative to player at origin
    console.log('[Respawn] closestRowIndex:', closestRowIndex)

    const executeRespawn = (selection: SafeRowSelection) => {
      // With ball movement, we respawn the player at the actual world Z position
      // rowZ is the row's visual position (relative to player at origin)
      // worldZ = playerZ + rowZ (add because rowZ is relative offset from player)
      const worldZ = playerZ + selection.rowZ
      console.log('[Respawn] selection:', selection, 'worldZ:', worldZ)
      // Immediately respawn player at the calculated position
      respawnPlayer([selection.safeX, PLAYER_INITIAL_POSITION[1], worldZ])
    }

    if (closestRowIndex !== -1) {
      const currentRowSelection = ensureMinimumRowSelection(
        selectSafeRow(rows, zValues, closestRowIndex, preferredX),
        rows,
        zValues,
        preferredX,
      )
      if (currentRowSelection) {
        executeRespawn(currentRowSelection)
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
        executeRespawn(shiftedSelection)
        return
      }
    }

    // 2. Current row is not safe (or invalid). Find the nearest safe row.
    // We scan all rows to ensure we find the spatially closest one,
    // rather than relying on index proximity which might be misleading in a ring buffer.
    // Use 0 as reference since rows are positioned relative to player
    const bestSelection = ensureMinimumRowSelection(
      getBestSafeRowSelection(rows, zValues, 0, preferredX),
      rows,
      zValues,
      preferredX,
    )

    if (!bestSelection) {
      console.warn('[Platform] Respawn: No valid safe row found in active set to snap to.')
      // Fallback to respawn at current X position, same Z
      respawnPlayer([preferredX, PLAYER_INITIAL_POSITION[1], playerZ])
      return
    }

    executeRespawn(bestSelection)
  }

  const onPlayerStatusChange = (playerStatus: PlayerStatus) => {
    if (!isPlatformReady) return
    if (playerStatus === 'out-of-bounds') onOutOfBounds()
  }

  usePlayerStatus(onPlayerStatusChange)

  // Return empty object - respawn is now immediate, no scroll completion needed
  return {}
}
