import {
  colToX,
  COLUMNS,
  createEmptyRingPositions,
  ON_TILE_Y,
  type RowData,
  type SectionType,
} from '@/utils/tiles'
import type { SectionBitmapLayout, SectionBitmapRow } from './sectionBitmap'

export function buildRowsFromLayout(
  layout: SectionBitmapLayout,
  type: SectionType,
  extraRowData?: (rowIndex: number, rowCount: number) => Partial<RowData>,
): RowData[] {
  const rowCount = layout.rowCount
  if (rowCount <= 0) return []

  const rows: RowData[] = new Array(rowCount)

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const layoutRow = layout.rows[rowIndex]
    const heights = [...layoutRow.heights]

    const baseRow: RowData = {
      heights,
      type,
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === rowCount - 1,
      isHighlighted: [],
    }

    const extra = extraRowData ? extraRowData(rowIndex, rowCount) : {}
    const row = { ...baseRow, ...extra }

    applyBitmapRowFeatures(row, layoutRow)
    rows[rowIndex] = row
  }

  return rows
}

export function applyBitmapRowFeatures(row: RowData, layoutRow: SectionBitmapRow) {
  applyRingColumns(row, layoutRow.ringColumns)
  applyInfoColumns(row, layoutRow)
  applyCollectibleColumn(row, layoutRow)
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

function applyInfoColumns(row: RowData, layoutRow: SectionBitmapRow) {
  const placements = layoutRow.infoZonePlacements
  if (placements && placements.length > 0) {
    row.infoZonePositions = placements.map(({ columnIndex, zOffset }) => {
      if (columnIndex < 0 || columnIndex >= COLUMNS) return null
      return [colToX(columnIndex), ON_TILE_Y, zOffset]
    })
    return
  }

  const columns = layoutRow.infoZoneColumns
  if (!columns || columns.length === 0) return
  row.infoZonePositions = columns.map((columnIndex) => {
    if (columnIndex < 0 || columnIndex >= COLUMNS) return null
    return [colToX(columnIndex), ON_TILE_Y, 0]
  })
}

function applyCollectibleColumn(row: RowData, layoutRow: SectionBitmapRow) {
  const placement = layoutRow.collectiblePlacement
  if (placement) {
    const { columnIndex, zOffset } = placement
    if (columnIndex < 0 || columnIndex >= COLUMNS) return
    row.collectiblePosition = [colToX(columnIndex), ON_TILE_Y, zOffset]
    return
  }

  const fallbackColumn = layoutRow.collectibleColumns[0] ?? null
  if (fallbackColumn == null || fallbackColumn < 0 || fallbackColumn >= COLUMNS) return
  row.collectiblePosition = [colToX(fallbackColumn), ON_TILE_Y, 0]
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
