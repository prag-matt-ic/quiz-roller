import { colToX, COLUMNS, type RowData, TILE_SIZE } from '@/utils/tiles'
import { HEADING_Y } from './floatingHeading'
import { parseSectionBitmap, type SectionBitmapLayout } from './sectionBitmap'
import { buildRowsFromLayout as buildGenericRows } from './sectionLayoutFeatures'

const HOME_HEADING_CENTER_ROW = 6
const HOME_HEADING_TRIGGER_ROW = Math.ceil(HOME_HEADING_CENTER_ROW)
const HOME_HEADING_RELATIVE_Z = (HOME_HEADING_TRIGGER_ROW - HOME_HEADING_CENTER_ROW) * TILE_SIZE
const HOME_HEADING_X = colToX(COLUMNS / 2 - 0.5)
const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

export function generateHomeSectionRowData(homeBitmap: HTMLImageElement | null): RowData[] {
  try {
    if (!homeBitmap) throw new Error('No bitmap provided')
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
  const headingRowIndex = clampRowIndex(layout.rowCount, HOME_HEADING_TRIGGER_ROW)

  return buildGenericRows(layout, 'home', (rowIndex) => {
    if (rowIndex === headingRowIndex) {
      return {
        floatingHeadingPosition: [HOME_HEADING_X, HEADING_Y, HOME_HEADING_RELATIVE_Z],
      }
    }
    return {}
  })
}

function clampRowIndex(rowCount: number, requestedIndex: number): number {
  if (rowCount === 0) return 0
  if (requestedIndex < 0) return 0
  if (requestedIndex >= rowCount) return rowCount - 1
  return requestedIndex
}
