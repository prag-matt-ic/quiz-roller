import { colToX, COLUMNS, ON_TILE_Y, type RowData, TILE_SIZE } from '@/utils/tiles'
import { parseSectionBitmap, type SectionBitmapLayout } from './sectionBitmap'
import { buildRowsFromLayout as buildGenericRows, clampRowIndex } from './sectionLayoutFeatures'

const CTA_ZONE_COLS = 7
const CTA_ZONE_ROWS = 7
const CTA_ZONE_START_COLUMN = Math.floor((COLUMNS - CTA_ZONE_COLS) / 2)
const CTA_ZONE_CENTER_COLUMN = CTA_ZONE_START_COLUMN + Math.floor(CTA_ZONE_COLS / 2)

export const CTA_ZONE_WIDTH = CTA_ZONE_COLS * TILE_SIZE
export const CTA_ZONE_HEIGHT = CTA_ZONE_ROWS * TILE_SIZE

const CTA_ZONE_CENTER_ROW = 12
const CTA_ZONE_TRIGGER_ROW = Math.ceil(CTA_ZONE_CENTER_ROW)
const CTA_ZONE_RELATIVE_Z = (CTA_ZONE_TRIGGER_ROW - CTA_ZONE_CENTER_ROW) * TILE_SIZE
const CTA_ZONE_X = colToX(CTA_ZONE_CENTER_COLUMN)

const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

export function generateCtaSectionRowData(bitmap: HTMLImageElement | null): RowData[] {
  try {
    if (!bitmap) throw new Error('No bitmap provided')
    const layout = parseSectionBitmap(bitmap)
    return buildRowsFromLayout(layout)
  } catch (error) {
    if (IS_DEV_ENV) {
      console.warn('[CtaSection] Failed to parse cta bitmap', error)
    }
    return []
  }
}

function buildRowsFromLayout(layout: SectionBitmapLayout): RowData[] {
  const ctaRowIndex = clampRowIndex(layout.rowCount, CTA_ZONE_TRIGGER_ROW)

  return buildGenericRows(layout, 'cta', (rowIndex) => {
    if (rowIndex === ctaRowIndex) {
      return {
        ctaZonePosition: [CTA_ZONE_X, ON_TILE_Y, CTA_ZONE_RELATIVE_Z],
      }
    }
    return {}
  })
}
