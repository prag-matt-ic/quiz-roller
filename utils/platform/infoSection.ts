import { colToX, COLUMNS, type RowData, TILE_SIZE } from '@/utils/tiles'
import { HEADING_Y } from './floatingHeading'
import { type SectionBitmapLayout } from './sectionBitmap'
import { buildRowsFromLayout as buildGenericRows, clampRowIndex } from './sectionLayoutFeatures'

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
  layout: SectionBitmapLayout | null
  contentIndex: 0 | 1 | 2
}

export function generateInfoSectionRowData(config: InfoSectionConfig): RowData[] {
  const { layout, contentIndex } = config
  try {
    if (!layout) throw new Error('No layout provided')
    return buildRowsFromLayout(layout, contentIndex)
  } catch (error) {
    console.error('[InfoSection] Failed to build info section rows', error)
    return []
  }
}

function buildRowsFromLayout(layout: SectionBitmapLayout, contentIndex: 0 | 1 | 2): RowData[] {
  const headingRowIndex = clampRowIndex(layout.rowCount, INFO_HEADING_TRIGGER_ROW)

  return buildGenericRows(layout, 'info', (rowIndex) => {
    const extra: Partial<RowData> = {
      infoContentIndex: contentIndex,
    }

    if (rowIndex === headingRowIndex) {
      extra.floatingHeadingPosition = [
        colToX(COLUMNS / 2 - 0.5),
        HEADING_Y,
        INFO_HEADING_RELATIVE_Z,
      ]
    }

    return extra
  })
}
