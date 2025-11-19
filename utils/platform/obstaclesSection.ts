import { type RowData } from '@/utils/tiles'
import { parseSectionBitmap, type SectionBitmapLayout } from './sectionBitmap'
import { applyBitmapRowFeatures } from './sectionLayoutFeatures'

const IS_DEV_ENV = process.env.NODE_ENV !== 'production'

export function generateObstacleSectionRowData(bitmap: HTMLImageElement | null): RowData[] {
  if (!bitmap) {
    if (IS_DEV_ENV) {
      console.warn('[ObstaclesSection] Cannot generate obstacle rows without a bitmap image')
    }
    return []
  }

  try {
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
  const rowCount = layout.rowCount
  if (rowCount <= 0) return []

  const rows: RowData[] = new Array(rowCount)

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const layoutRow = layout.rows[rowIndex]
    const heights = [...layoutRow.heights]

    rows[rowIndex] = {
      heights,
      type: 'obstacles',
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === rowCount - 1,
      isHighlighted: [],
    }

    applyBitmapRowFeatures(rows[rowIndex], layoutRow)
  }

  return rows
}
