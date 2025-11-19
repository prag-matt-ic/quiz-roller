import { colToX, COLUMNS, type RowData, TILE_SIZE } from '@/utils/tiles'
import { HEADING_Y } from './floatingHeading'
import { parseSectionBitmap, type SectionBitmapLayout } from './sectionBitmap'
import { applyBitmapRowFeatures } from './sectionLayoutFeatures'

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

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const layoutRow = layout.rows[rowIndex]
    const heights = [...layoutRow.heights]

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

    applyBitmapRowFeatures(row, layoutRow)
    rows[rowIndex] = row
  }

  return rows
}


function clampRowIndex(rowCount: number, requestedIndex: number): number {
  if (rowCount === 0) return 0
  if (requestedIndex < 0) return 0
  if (requestedIndex >= rowCount) return rowCount - 1
  return requestedIndex
}
