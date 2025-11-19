import { COLUMNS, SAFE_HEIGHT, UNSAFE_HEIGHT } from '@/utils/tiles'

export type SectionBitmapRow = {
  heights: number[]
  ringColumns: number[]
  infoZoneColumns: number[]
  collectibleColumn: number | null
  highlightColumns: number[]
}

export type SectionBitmapLayout = {
  rows: SectionBitmapRow[]
  rowCount: number
}

const COLOR = {
  VOID: [0, 0, 0] as const,
  RING: [255, 0, 0] as const,
  INFO: [0, 255, 0] as const,
  COLLECTIBLE: [0, 0, 255] as const,
  HIGHLIGHT: [0, 255, 255] as const,
}

const isColor = (r: number, g: number, b: number, [cr, cg, cb]: readonly number[]) =>
  r === cr && g === cg && b === cb

export function parseSectionBitmap(image: HTMLImageElement): SectionBitmapLayout {
  if (typeof window === 'undefined') {
    throw new Error('parseSectionBitmap must run in the browser')
  }

  const width = COLUMNS
  const imageWidth = image.naturalWidth || image.width
  const imageHeight = image.naturalHeight || image.height

  if (!imageHeight || !imageWidth) {
    throw new Error('Section bitmap image is missing intrinsic dimensions')
  }

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = imageHeight
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) {
    throw new Error('Failed to initialise canvas context for section bitmap parsing')
  }

  // Draw the source image scaled to match the platform column count.
  context.drawImage(image, 0, 0, imageWidth, imageHeight, 0, 0, width, imageHeight)

  const { data } = context.getImageData(0, 0, width, imageHeight)

  const rows: SectionBitmapRow[] = new Array(imageHeight)

  for (let srcRow = 0; srcRow < imageHeight; srcRow++) {
    const rowIndex = imageHeight - 1 - srcRow // bottom row -> index 0
    const heights = new Array<number>(width)
    const ringColumns: number[] = []
    const infoZoneColumns: number[] = []
    const highlightColumns: number[] = []
    let collectibleColumn: number | null = null

    for (let column = 0; column < width; column++) {
      const pixelIndex = (srcRow * width + column) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]

      const isRaised = !isColor(r, g, b, COLOR.VOID)
      heights[column] = isRaised ? SAFE_HEIGHT : UNSAFE_HEIGHT

      if (isColor(r, g, b, COLOR.RING)) {
        ringColumns.push(column)
      }

      if (isColor(r, g, b, COLOR.INFO)) {
        infoZoneColumns.push(column)
        highlightColumns.push(column)
      }

      if (isColor(r, g, b, COLOR.COLLECTIBLE)) {
        if (collectibleColumn == null) {
          collectibleColumn = column
        }
        highlightColumns.push(column)
      }

      if (isColor(r, g, b, COLOR.HIGHLIGHT)) {
        highlightColumns.push(column)
      }
    }

    rows[rowIndex] = {
      heights,
      ringColumns,
      infoZoneColumns,
      collectibleColumn,
      highlightColumns,
    }
  }

  // Release canvas resources promptly
  context.canvas.width = 0
  context.canvas.height = 0

  return {
    rows,
    rowCount: rows.length,
  }
}
