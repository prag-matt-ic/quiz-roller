import {
  colToX,
  COLUMNS,
  createEmptyRingPositions,
  ON_TILE_Y,
  type RowData,
} from '@/utils/tiles'
import type { SectionBitmapRow } from './sectionBitmap'

export type InfoZonePlacement = {
  columnIndex: number
  zOffset: number
}

export function applyBitmapRowFeatures(
  row: RowData,
  layoutRow: SectionBitmapRow,
  infoZonePlacements?: InfoZonePlacement[],
) {
  applyRingColumns(row, layoutRow.ringColumns)
  applyInfoColumns(row, infoZonePlacements)
  applyCollectibleColumn(row, layoutRow.collectibleColumn)
  applyHighlightColumns(row, layoutRow.highlightColumns)
}

function applyRingColumns(row: RowData, columns?: number[]) {
  if (!columns || columns.length === 0) return
  const ringPositions = row.ringPositions ?? createEmptyRingPositions()
  columns.forEach((columnIndex) => {
    if (columnIndex < 0 || columnIndex >= COLUMNS) return
    ringPositions[columnIndex] = 1
  })
  row.ringPositions = ringPositions
}

function applyInfoColumns(row: RowData, placements?: InfoZonePlacement[]) {
  if (!placements || placements.length === 0) return
  row.infoZonePositions = placements.map(({ columnIndex, zOffset }) => {
    if (columnIndex < 0 || columnIndex >= COLUMNS) return null
    return [colToX(columnIndex), ON_TILE_Y, zOffset]
  })
}

function applyCollectibleColumn(row: RowData, column: number | null) {
  if (column == null || column < 0 || column >= COLUMNS) return
  row.collectiblePosition = [colToX(column), ON_TILE_Y, 0]
}

function applyHighlightColumns(row: RowData, columns?: number[]) {
  if (!columns || columns.length === 0) return
  const highlights = row.isHighlighted ?? []
  columns.forEach((columnIndex) => {
    if (columnIndex < 0 || columnIndex >= COLUMNS) return
    highlights[columnIndex] = 1
  })
  row.isHighlighted = highlights
}
