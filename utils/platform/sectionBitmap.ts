import { COLUMNS, SAFE_HEIGHT, TILE_SIZE, UNSAFE_HEIGHT } from '@/utils/tiles'

export type SectionBitmapRow = {
  heights: number[]
  highlightColumns: number[]
  ringColumns: number[]
  infoZoneColumns: number[]
  collectibleColumns: number[]
  finishLineColumns: number[]
  infoZonePlacements?: BitmapPlacement[]
  collectiblePlacement?: BitmapPlacement | null
  finishLinePlacement?: BitmapPlacement | null
}

export type SectionBitmapLayout = {
  rows: SectionBitmapRow[]
  rowCount: number
}

export type BitmapPlacement = {
  columnIndex: number
  zOffset: number
}

const COLOR = {
  VOID: [0, 0, 0] as const,
  RING: [255, 0, 0] as const,
  INFO: [0, 255, 0] as const,
  COLLECTIBLE: [0, 0, 255] as const,
  HIGHLIGHT: [0, 255, 255] as const,
  FINISH_LINE: [255, 255, 0] as const,
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
    const collectibleColumns: number[] = []
    const finishLineColumns: number[] = []

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
        collectibleColumns.push(column)
        highlightColumns.push(column)
      }

      if (isColor(r, g, b, COLOR.FINISH_LINE)) {
        finishLineColumns.push(column)
      }

      if (isColor(r, g, b, COLOR.HIGHLIGHT)) {
        highlightColumns.push(column)
      }
    }

    rows[rowIndex] = {
      heights,
      ringColumns,
      infoZoneColumns,
      collectibleColumns,
      finishLineColumns,
      highlightColumns,
    }
  }

  assignBitmapPlacements(
    rows,
    (row) => row.infoZoneColumns,
    (rowIndex, placements) => {
      if (!placements.length) return
      rows[rowIndex].infoZonePlacements = placements
    },
  )

  assignBitmapPlacements(
    rows,
    (row) => row.collectibleColumns,
    (rowIndex, placements) => {
      rows[rowIndex].collectiblePlacement = placements[0] ?? null
    },
  )

  assignBitmapPlacements(
    rows,
    (row) => row.finishLineColumns,
    (rowIndex, placements) => {
      rows[rowIndex].finishLinePlacement = placements[0] ?? null
    },
  )

  // Release canvas resources promptly
  context.canvas.width = 0
  context.canvas.height = 0

  return {
    rows,
    rowCount: rows.length,
  }
}

type ColumnsAccessor = (row: SectionBitmapRow) => number[]
type PlacementAssigner = (rowIndex: number, placements: BitmapPlacement[]) => void

function assignBitmapPlacements(
  rows: SectionBitmapRow[],
  getColumns: ColumnsAccessor,
  assignPlacements: PlacementAssigner,
) {
  const rowCount = rows.length
  if (rowCount === 0) return

  const columnSets = rows.map((row) => new Set(getColumns(row)))
  const visited = new Set<string>()
  const placementsByRow = new Map<number, BitmapPlacement[]>()
  const keyFor = (row: number, column: number) => `${row}:${column}`
  const NEIGHBOUR_OFFSETS: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const columns = columnSets[rowIndex]
    if (!columns.size) continue

    columns.forEach((column) => {
      const seedKey = keyFor(rowIndex, column)
      if (visited.has(seedKey)) return

      const stack: Array<{ row: number; column: number }> = [{ row: rowIndex, column }]
      const component: Array<{ row: number; column: number }> = []

      while (stack.length > 0) {
        const cell = stack.pop()!
        const cellKey = keyFor(cell.row, cell.column)
        if (visited.has(cellKey)) continue
        visited.add(cellKey)
        component.push(cell)

        for (const [dRow, dColumn] of NEIGHBOUR_OFFSETS) {
          const nextRow = cell.row + dRow
          if (nextRow < 0 || nextRow >= rowCount) continue
          const nextColumn = cell.column + dColumn
          if (!columnSets[nextRow].has(nextColumn)) continue
          stack.push({ row: nextRow, column: nextColumn })
        }
      }

      if (!component.length) return

      let minRow = Infinity
      let maxRow = -Infinity
      let minColumn = Infinity
      let maxColumn = -Infinity
      const rowsInComponent = new Set<number>()

      for (const { row, column: col } of component) {
        rowsInComponent.add(row)
        if (row < minRow) minRow = row
        if (row > maxRow) maxRow = row
        if (col < minColumn) minColumn = col
        if (col > maxColumn) maxColumn = col
      }

      const centerRow = (minRow + maxRow) * 0.5
      const centerColumn = Math.round((minColumn + maxColumn) / 2)

      rowsInComponent.forEach((row) => {
        const placements = placementsByRow.get(row) ?? []
        placements.push({
          columnIndex: centerColumn,
          zOffset: (row - centerRow) * TILE_SIZE,
        })
        placementsByRow.set(row, placements)
      })
    })
  }

  placementsByRow.forEach((placements, rowIndex) => {
    placements.sort((a, b) => a.columnIndex - b.columnIndex)
    assignPlacements(rowIndex, placements)
  })
}
