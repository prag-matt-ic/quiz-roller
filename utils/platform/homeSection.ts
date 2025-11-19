import { colToX, COLUMNS, type RowData, TILE_SIZE } from '@/utils/tiles'
import { HEADING_Y } from './floatingHeading'
import { parseSectionBitmap, type SectionBitmapLayout } from './sectionBitmap'
import { applyBitmapRowFeatures } from './sectionLayoutFeatures'

const HOME_HEADING_CENTER_ROW = 6
const HOME_HEADING_TRIGGER_ROW = Math.ceil(HOME_HEADING_CENTER_ROW)
const HOME_HEADING_RELATIVE_Z = (HOME_HEADING_TRIGGER_ROW - HOME_HEADING_CENTER_ROW) * TILE_SIZE
const HOME_HEADING_X = colToX(COLUMNS / 2 - 0.5)
const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

export function generateHomeSectionRowData(homeBitmap: HTMLImageElement | null): RowData[] {
  if (!homeBitmap) {
    if (IS_DEV_ENV) {
      console.warn('[HomeSection] Cannot generate home rows without a bitmap image')
    }
    return []
  }

  try {
    const layout = parseSectionBitmap(homeBitmap)
    return buildRowsFromLayout(layout)
  } catch (error) {
    if (IS_DEV_ENV) {
      console.warn('[HomeSection] Failed to parse home bitmap', error)
    }
    return []
  }
}

function buildRowsFromLayout(layout: SectionBitmapLayout): RowData[] {
  const rowCount = layout.rowCount
  if (rowCount <= 0) return []

  const headingRowIndex = clampRowIndex(rowCount, HOME_HEADING_TRIGGER_ROW)

  const rows: RowData[] = new Array(rowCount)

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const layoutRow = layout.rows[rowIndex]
    const heights = [...layoutRow.heights]

    rows[rowIndex] = {
      heights,
      type: 'home',
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === rowCount - 1,
      isHighlighted: [],
    }

    if (rowIndex === headingRowIndex) {
      rows[rowIndex].floatingHeadingPosition = [
        HOME_HEADING_X,
        HEADING_Y,
        HOME_HEADING_RELATIVE_Z,
      ]
    }

    applyBitmapRowFeatures(rows[rowIndex], layoutRow)
  }

  return rows
}

function clampRowIndex(rowCount: number, requestedIndex: number): number {
  if (rowCount === 0) return 0
  if (requestedIndex < 0) return 0
  if (requestedIndex >= rowCount) return rowCount - 1
  return requestedIndex
}
