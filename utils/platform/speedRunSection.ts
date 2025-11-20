import { type RowData } from '@/utils/tiles'
import { parseSectionBitmap, type SectionBitmapLayout } from './sectionBitmap'
import { buildRowsFromLayout as buildGenericRows } from './sectionLayoutFeatures'

const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

export function generateSpeedRunSectionRowData(bitmap: HTMLImageElement | null): RowData[] {
  try {
    if (!bitmap) throw new Error('No bitmap provided')
    const layout = parseSectionBitmap(bitmap)
    return buildRowsFromLayout(layout)
  } catch (error) {
    if (IS_DEV_ENV) {
      console.warn('[SpeedRunSection] Failed to parse speed run bitmap', error)
    }
    return []
  }
}

function buildRowsFromLayout(layout: SectionBitmapLayout): RowData[] {
  return buildGenericRows(layout, 'speed-run-finish')
}
