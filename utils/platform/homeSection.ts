import { colToX, COLUMNS, type RowData, TILE_SIZE } from '@/utils/tiles'
import { HEADING_Y } from './floatingHeading'
import { type SectionBitmapLayout } from './sectionBitmap'
import { buildRowsFromLayout as buildGenericRows, clampRowIndex } from './sectionLayoutFeatures'

const HOME_HEADING_CENTER_ROW = 6
const HOME_HEADING_TRIGGER_ROW = Math.ceil(HOME_HEADING_CENTER_ROW)
const HOME_HEADING_RELATIVE_Z = (HOME_HEADING_TRIGGER_ROW - HOME_HEADING_CENTER_ROW) * TILE_SIZE
const HOME_HEADING_X = colToX(COLUMNS / 2 - 0.5)

export function generateHomeSectionRowData(layout: SectionBitmapLayout | null): RowData[] {
  try {
    if (!layout) throw new Error('No layout provided')
    return buildRowsFromLayout(layout)
  } catch (error) {
    console.error('[HomeSection] Failed to build home section rows', error)
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
