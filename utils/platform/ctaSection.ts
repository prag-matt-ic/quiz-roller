import { colToX, COLUMNS, ON_TILE_Y, type RowData, SAFE_HEIGHT, TILE_SIZE } from '@/utils/tiles'
import { roughenEdges } from './roughenEdges'

const CTA_SECTION_ROWS = 24

const CTA_ZONE_CENTER_ROW = 12
const CTA_ZONE_ROWS = 7
const CTA_ZONE_COLS = 7

const CTA_ZONE_START_COLUMN = Math.floor((COLUMNS - CTA_ZONE_COLS) / 2)
const CTA_ZONE_CENTER_COLUMN = CTA_ZONE_START_COLUMN + Math.floor(CTA_ZONE_COLS / 2)

export const CTA_ZONE_WIDTH = CTA_ZONE_COLS * TILE_SIZE
export const CTA_ZONE_HEIGHT = CTA_ZONE_ROWS * TILE_SIZE

const CTA_ZONE_TRIGGER_ROW = Math.ceil(CTA_ZONE_CENTER_ROW)
const CTA_ZONE_RELATIVE_Z = (CTA_ZONE_TRIGGER_ROW - CTA_ZONE_CENTER_ROW) * TILE_SIZE
const CTA_ZONE_X = colToX(CTA_ZONE_CENTER_COLUMN)

export function generateCtaSectionRowData(): RowData[] {
  const rows: RowData[] = new Array(CTA_SECTION_ROWS)

  const pyramidStartCol = CTA_ZONE_START_COLUMN
  const pyramidEndCol = CTA_ZONE_START_COLUMN + CTA_ZONE_COLS

  for (let rowIndex = 0; rowIndex < CTA_SECTION_ROWS; rowIndex++) {
    const heights = new Array<number>(COLUMNS).fill(SAFE_HEIGHT)

    rows[rowIndex] = {
      heights,
      type: 'cta',
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === CTA_SECTION_ROWS - 1,
    }

    if (rowIndex === CTA_ZONE_TRIGGER_ROW) {
      rows[rowIndex].ctaZonePosition = [CTA_ZONE_X, ON_TILE_Y, CTA_ZONE_RELATIVE_Z]
    }
  }

  roughenEdges({
    rows,
    seed: 300,
    protectRanges: [
      {
        startCol: pyramidStartCol,
        endColExclusive: pyramidEndCol,
      },
    ],
    rowWindow: {
      start: 1,
      endExclusive: CTA_SECTION_ROWS - 1,
    },
    maxIndentColumns: 2,
  })

  return rows
}
