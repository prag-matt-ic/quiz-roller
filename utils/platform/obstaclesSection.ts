import { type RowData } from '@/utils/tiles'
import { type SectionBitmapLayout } from './sectionBitmap'
import { buildRowsFromLayout as buildGenericRows } from './sectionLayoutFeatures'

const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

export function generateObstacleSectionRowData(layout: SectionBitmapLayout | null): RowData[] {
  try {
    if (!layout) throw new Error('No layout provided')
    return buildRowsFromLayout(layout)
  } catch (error) {
    if (IS_DEV_ENV) {
      console.warn('[ObstaclesSection] Failed to build obstacle section rows', error)
    }
    return []
  }
}

function buildRowsFromLayout(layout: SectionBitmapLayout): RowData[] {
  return buildGenericRows(layout, 'obstacles')
}
