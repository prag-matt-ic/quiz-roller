import { type RowData } from '@/utils/tiles'
import { parseSectionBitmap, type SectionBitmapLayout } from './sectionBitmap'
import { buildRowsFromLayout as buildGenericRows } from './sectionLayoutFeatures'

const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

export function generateObstacleSectionRowData(bitmap: HTMLImageElement | null): RowData[] {
  try {
    if (!bitmap) throw new Error('No bitmap provided')
    const layout = parseSectionBitmap(bitmap)
    return buildRowsFromLayout(layout)
  } catch (error) {
    if (IS_DEV_ENV) {
      console.warn('[ObstaclesSection] Failed to parse obstacle bitmap', error)
    }
    return []
  }
}

function buildRowsFromLayout(layout: SectionBitmapLayout): RowData[] {
  return buildGenericRows(layout, 'obstacles')
}
