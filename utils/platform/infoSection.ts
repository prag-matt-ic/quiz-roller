import { colToX, COLUMNS, type RowData, TILE_SIZE } from '@/utils/tiles'
import { HEADING_Y } from './floatingHeading'
import { parseSectionBitmap, type SectionBitmapLayout } from './sectionBitmap'
import { applyBitmapRowFeatures, type InfoZonePlacement } from './sectionLayoutFeatures'

export const FIRST_OBSTACLE_SECTION_ROWS = 16
export const OBSTACLE_SECTION_ROWS = 48

const INFO_HEADING_CENTER_ROW = 5
const INFO_HEADING_TRIGGER_ROW = Math.ceil(INFO_HEADING_CENTER_ROW)
const INFO_HEADING_RELATIVE_Z = (INFO_HEADING_TRIGGER_ROW - INFO_HEADING_CENTER_ROW) * TILE_SIZE

const INFO_ZONE_COLS = 5
const INFO_ZONE_ROWS = 5

// Answer tile fixed sizing (in world units, aligned to grid columns/rows)
export const INFO_ZONE_WIDTH = INFO_ZONE_COLS * TILE_SIZE
export const INFO_ZONE_HEIGHT = INFO_ZONE_ROWS * TILE_SIZE

type InfoSectionConfig = {
  bitmap: HTMLImageElement | null
  contentIndex: 0 | 1 | 2
}

export function generateInfoSectionRowData(config: InfoSectionConfig): RowData[] {
  const { bitmap, contentIndex } = config

  if (!bitmap) {
    console.error('[InfoSection] Cannot generate info rows without a bitmap image')
    return []
  }

  try {
    const layout = parseSectionBitmap(bitmap)
    return buildRowsFromLayout(layout, contentIndex)
  } catch (error) {
    console.error('[InfoSection] Failed to parse info bitmap', error)
    return []
  }
}

function buildRowsFromLayout(layout: SectionBitmapLayout, contentIndex: 0 | 1 | 2): RowData[] {
  const rowCount = layout.rowCount
  if (rowCount <= 0) return []

  const headingRowIndex = clampRowIndex(rowCount, INFO_HEADING_TRIGGER_ROW)
  const rows: RowData[] = new Array(rowCount)
  const infoZonePlacementsByRow = computeInfoZonePlacements(layout)

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const layoutRow = layout.rows[rowIndex]
    const heights = [...layoutRow.heights]
    const infoPlacements = infoZonePlacementsByRow.get(rowIndex)

    const row: RowData = {
      heights,
      type: 'info',
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === rowCount - 1,
      infoContentIndex: contentIndex,
      isHighlighted: [],
    }

    if (rowIndex === headingRowIndex) {
      row.floatingHeadingPosition = [
        colToX(COLUMNS / 2 - 0.5),
        HEADING_Y,
        INFO_HEADING_RELATIVE_Z,
      ]
    }

    applyBitmapRowFeatures(row, layoutRow, infoPlacements)
    rows[rowIndex] = row
  }

  return rows
}

function computeInfoZonePlacements(
  layout: SectionBitmapLayout,
): Map<number, InfoZonePlacement[]> {
  const placementsByRow = new Map<number, InfoZonePlacement[]>()
  const rowCount = layout.rowCount
  if (rowCount <= 0) return placementsByRow

  const infoColumnSets = layout.rows.map((row) => new Set(row.infoZoneColumns))
  const visited = new Set<string>()
  const keyFor = (row: number, column: number) => `${row}:${column}`
  const NEIGHBOUR_OFFSETS: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const columns = layout.rows[rowIndex].infoZoneColumns
    if (!columns.length) continue

    for (const column of columns) {
      const seedKey = keyFor(rowIndex, column)
      if (visited.has(seedKey)) continue

      const stack: Array<{ row: number; column: number }> = [{ row: rowIndex, column }]
      const component: Array<{ row: number; column: number }> = []

      while (stack.length > 0) {
        const cell = stack.pop()!
        const cellKey = keyFor(cell.row, cell.column)
        if (visited.has(cellKey)) continue
        visited.add(cellKey)
        component.push(cell)

        for (const [dRow, dColumn] of NEIGHBOUR_OFFSETS) {
          const nextRow = cell.row + dRow
          const nextColumn = cell.column + dColumn
          if (nextRow < 0 || nextRow >= rowCount) continue
          if (!infoColumnSets[nextRow].has(nextColumn)) continue
          stack.push({ row: nextRow, column: nextColumn })
        }
      }

      if (!component.length) continue

      let minRow = Infinity
      let maxRow = -Infinity
      let minColumn = Infinity
      let maxColumn = -Infinity
      const rowsInComponent = new Set<number>()

      for (const { row, column: col } of component) {
        rowsInComponent.add(row)
        if (row < minRow) minRow = row
        if (row > maxRow) maxRow = row
        if (col < minColumn) minColumn = col
        if (col > maxColumn) maxColumn = col
      }

      const centerRow = Math.round((minRow + maxRow) / 2)
      const centerColumn = Math.round((minColumn + maxColumn) / 2)

      rowsInComponent.forEach((row) => {
        const placements = placementsByRow.get(row) ?? []
        placements.push({
          columnIndex: centerColumn,
          zOffset: (row - centerRow) * TILE_SIZE,
        })
        placementsByRow.set(row, placements)
      })
    }
  }

  placementsByRow.forEach((placements) => {
    placements.sort((a, b) => a.columnIndex - b.columnIndex)
  })

  return placementsByRow
}

function clampRowIndex(rowCount: number, requestedIndex: number): number {
  if (rowCount === 0) return 0
  if (requestedIndex < 0) return 0
  if (requestedIndex >= rowCount) return rowCount - 1
  return requestedIndex
}
