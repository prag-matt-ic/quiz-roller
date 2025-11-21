import { type RowData } from '@/utils/tiles'
import { type SectionBitmapLayout } from './sectionBitmap'
import { buildRowsFromLayout as buildGenericRows } from './sectionLayoutFeatures'

const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

export function generateSpeedRunSectionRowData(layout: SectionBitmapLayout | null): RowData[] {
  try {
    if (!layout) throw new Error('No layout provided')
    return buildRowsFromLayout(layout)
  } catch (error) {
    if (IS_DEV_ENV) {
      console.warn('[SpeedRunSection] Failed to build speed run section rows', error)
    }
    return []
  }
}

function buildRowsFromLayout(layout: SectionBitmapLayout): RowData[] {
  return buildGenericRows(layout, 'speed-run-finish')
}
