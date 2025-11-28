import { Stage } from '@/stores/types'
import type { TotalCounts } from '@/stores/totalCounts'
import {
  colToX,
  COLUMNS,
  createEmptyRingPositions,
  ON_TILE_Y,
  SAFE_HEIGHT,
  TILE_SIZE,
  UNSAFE_HEIGHT,
  type IndexedPlacement,
  type RowData,
} from '@/utils/tiles'
import { HEADING_Y } from './floatingHeading'

type BitmapPlacement = {
  columnIndex: number
  zOffset: number
}

type BitmapRow = {
  heights: number[]
  highlightColumns: number[]
  ringColumns: number[]
  infoZoneColumns: number[]
  collectibleColumns: number[]
  finishLineColumns: number[]
  floatingHeadingColumns: number[]
  infoZonePlacements?: BitmapPlacement[]
  collectiblePlacements?: BitmapPlacement[]
  finishLinePlacement?: BitmapPlacement | null
  floatingHeadingPlacement?: BitmapPlacement | null
}

type PlacementIndexKey = Exclude<keyof TotalCounts, 'rows' | 'rings'>

export type SectionBitmapParseResult = {
  rows: RowData[]
}

const COLOUR_CODES = {
  VOID: [0, 0, 0] as const,
  RING: [255, 0, 0] as const,
  FLOATING_HEADING: [128, 128, 128] as const,
  INFO_ZONE: [0, 255, 0] as const,
  COLLECTIBLE: [0, 0, 255] as const,
  HIGHLIGHT: [0, 255, 255] as const,
  FINISH_LINE: [255, 255, 0] as const,
}

const isColour = (r: number, g: number, b: number, [cr, cg, cb]: readonly number[]) =>
  r === cr && g === cg && b === cb

export function parseSectionBitmap(
  image: HTMLImageElement,
  stage: Stage,
  totalCounts: TotalCounts,
): SectionBitmapParseResult {
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

  const rows: BitmapRow[] = new Array(imageHeight)

  for (let srcRow = 0; srcRow < imageHeight; srcRow++) {
    const rowIndex = imageHeight - 1 - srcRow // bottom row -> index 0
    const heights = new Array<number>(width)
    const ringColumns: number[] = []
    const infoZoneColumns: number[] = []
    const highlightColumns: number[] = []
    const collectibleColumns: number[] = []
    const finishLineColumns: number[] = []
    const floatingHeadingColumns: number[] = []

    for (let column = 0; column < width; column++) {
      const pixelIndex = (srcRow * width + column) * 4
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]

      const isRaised = !isColour(r, g, b, COLOUR_CODES.VOID)
      heights[column] = isRaised ? SAFE_HEIGHT : UNSAFE_HEIGHT

      if (isColour(r, g, b, COLOUR_CODES.RING)) {
        ringColumns.push(column)
      }

      if (isColour(r, g, b, COLOUR_CODES.INFO_ZONE)) {
        infoZoneColumns.push(column)
        highlightColumns.push(column)
      }

      if (isColour(r, g, b, COLOUR_CODES.COLLECTIBLE)) {
        collectibleColumns.push(column)
        highlightColumns.push(column)
      }

      if (isColour(r, g, b, COLOUR_CODES.FINISH_LINE)) {
        finishLineColumns.push(column)
      }

      if (isColour(r, g, b, COLOUR_CODES.HIGHLIGHT)) {
        highlightColumns.push(column)
      }

      if (isColour(r, g, b, COLOUR_CODES.FLOATING_HEADING)) {
        floatingHeadingColumns.push(column)
      }
    }

    rows[rowIndex] = {
      heights,
      ringColumns,
      infoZoneColumns,
      collectibleColumns,
      finishLineColumns,
      highlightColumns,
      floatingHeadingColumns,
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
      if (!placements.length) return
      rows[rowIndex].collectiblePlacements = placements
    },
  )

  assignBitmapPlacements(
    rows,
    (row) => row.finishLineColumns,
    (rowIndex, placements) => {
      rows[rowIndex].finishLinePlacement = placements[0] ?? null
    },
  )

  assignBitmapPlacements(
    rows,
    (row) => row.floatingHeadingColumns,
    (rowIndex, placements) => {
      rows[rowIndex].floatingHeadingPlacement = placements[0] ?? null
    },
  )

  // Release canvas resources promptly
  context.canvas.width = 0
  context.canvas.height = 0

  const totalRingsCount = rows.reduce((count, row) => count + row.ringColumns.length, 0)
  const rowData = buildRowDataFromBitmapRows({ rows, stage, globalIndexes: totalCounts })
  totalCounts.rings += totalRingsCount

  return {
    rows: rowData,
  }
}

type ColumnsAccessor = (row: BitmapRow) => number[]
type PlacementAssigner = (rowIndex: number, placements: BitmapPlacement[]) => void

/**
 * For a given surface element (info zones, collectibles, etc.) this helper scans the bitmap rows,
 * groups neighbouring coloured pixels into connected components (4-directional), and records a
 * single placement for every row that participates in that component. The function is invoked once
 * per element type, so a row can safely contain both info zones and collectibles simultaneously.
 */
function assignBitmapPlacements(
  rows: BitmapRow[],
  getColumns: ColumnsAccessor,
  assignPlacements: PlacementAssigner,
) {
  const rowCount = rows.length
  if (rowCount === 0) return

  const columnSets = rows.map((row) => new Set(getColumns(row)))
  // Track which bitmap cells have already been consumed for this feature type.
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

      // Depth-first search starting from this pixel to capture the entire connected component.
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
    // Hand back the per-row placement list to the caller (info zones, collectibles, etc.).
    assignPlacements(rowIndex, placements)
  })
}

function buildRowDataFromBitmapRows({
  rows,
  stage,
  globalIndexes,
}: {
  rows: BitmapRow[]
  stage: Stage
  globalIndexes: TotalCounts
}): RowData[] {
  const rowCount = rows.length
  if (rowCount <= 0) return []

  const rowData: RowData[] = new Array(rowCount)

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const layoutRow = rows[rowIndex]

    const baseRow: RowData = {
      heights: layoutRow.heights,
      stage,
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === rowCount - 1,
      isHighlighted: [],
      rowIndex: globalIndexes.rows,
    }

    globalIndexes.rows++

    applyRingColumns(baseRow, layoutRow.ringColumns)
    applyInfoColumns(baseRow, layoutRow, globalIndexes)
    applyCollectiblePlacements(baseRow, layoutRow, globalIndexes)
    applyFinishLineColumn(baseRow, layoutRow)
    applyFloatingHeadingPlacement(baseRow, layoutRow, globalIndexes)
    applyHighlightColumns(baseRow, layoutRow.highlightColumns)

    rowData[rowIndex] = baseRow
  }

  return rowData
}

function applyRingColumns(row: RowData, columns?: number[]) {
  if (!columns || columns.length === 0) return
  const ringPositions = row.ringPositions ?? createEmptyRingPositions()
  columns.forEach((columnIndex) => {
    if (columnIndex < 0 || columnIndex >= COLUMNS) return
    ringPositions[columnIndex] = 1
  })
  row.ringPositions = ringPositions
}

function applyInfoColumns(row: RowData, layoutRow: BitmapRow, globalIndexes: TotalCounts) {
  const placements =
    buildPlacementsFromBitmap(
      layoutRow.infoZonePlacements,
      ON_TILE_Y,
      'infoZones',
      globalIndexes,
    ) ??
    buildPlacementsFromColumns(layoutRow.infoZoneColumns, ON_TILE_Y, 'infoZones', globalIndexes)

  if (placements?.length) {
    row.infoZonePlacements = placements
  }
}

function applyCollectiblePlacements(
  row: RowData,
  layoutRow: BitmapRow,
  globalIndexes: TotalCounts,
) {
  const placements =
    buildPlacementsFromBitmap(
      layoutRow.collectiblePlacements,
      ON_TILE_Y,
      'collectibles',
      globalIndexes,
    ) ??
    buildPlacementsFromColumns(
      layoutRow.collectibleColumns,
      ON_TILE_Y,
      'collectibles',
      globalIndexes,
    )

  if (placements?.length) {
    row.collectiblePlacements = placements
  }
}

function applyFinishLineColumn(row: RowData, layoutRow: BitmapRow) {
  const placement = layoutRow.finishLinePlacement
  if (placement) {
    const { columnIndex, zOffset } = placement
    if (columnIndex < 0 || columnIndex >= COLUMNS) return
    row.finishLinePosition = [colToX(columnIndex), ON_TILE_Y, zOffset]
    return
  }

  const fallbackColumn = layoutRow.finishLineColumns[0] ?? null
  if (fallbackColumn == null || fallbackColumn < 0 || fallbackColumn >= COLUMNS) return
  row.finishLinePosition = [colToX(fallbackColumn), ON_TILE_Y, 0]
}

function applyHighlightColumns(row: RowData, columns?: number[]) {
  if (!columns || columns.length === 0) return
  const highlights = row.isHighlighted ?? []
  columns.forEach((columnIndex) => {
    if (columnIndex < 0 || columnIndex >= COLUMNS) return
    highlights[columnIndex] = 1
  })
  row.isHighlighted = highlights
}

function applyFloatingHeadingPlacement(
  row: RowData,
  layoutRow: BitmapRow,
  globalIndexes: TotalCounts,
) {
  const placement = layoutRow.floatingHeadingPlacement
  if (!placement) return
  const { columnIndex, zOffset } = placement
  const indexedPlacement = createIndexedPlacement(
    columnIndex,
    zOffset,
    HEADING_Y,
    'headings',
    globalIndexes,
  )
  if (indexedPlacement) {
    row.floatingHeadingPlacements = [indexedPlacement]
  }
}

function buildPlacementsFromBitmap(
  placements: BitmapPlacement[] | undefined,
  y: number,
  indexKey: PlacementIndexKey,
  globalIndexes: TotalCounts,
): IndexedPlacement[] | undefined {
  if (!placements?.length) return undefined
  const indexedPlacements: IndexedPlacement[] = []
  placements.forEach(({ columnIndex, zOffset }) => {
    const placement = createIndexedPlacement(columnIndex, zOffset, y, indexKey, globalIndexes)
    if (placement) {
      indexedPlacements.push(placement)
    }
  })
  return indexedPlacements.length > 0 ? indexedPlacements : undefined
}

function buildPlacementsFromColumns(
  columns: number[] | undefined,
  y: number,
  indexKey: PlacementIndexKey,
  globalIndexes: TotalCounts,
): IndexedPlacement[] | undefined {
  if (!columns?.length) return undefined
  const indexedPlacements: IndexedPlacement[] = []
  columns.forEach((columnIndex) => {
    const placement = createIndexedPlacement(columnIndex, 0, y, indexKey, globalIndexes)
    if (placement) {
      indexedPlacements.push(placement)
    }
  })
  return indexedPlacements.length > 0 ? indexedPlacements : undefined
}

function createIndexedPlacement(
  columnIndex: number,
  zOffset: number,
  y: number,
  indexKey: PlacementIndexKey,
  globalIndexes: TotalCounts,
): IndexedPlacement | null {
  if (columnIndex < 0 || columnIndex >= COLUMNS) return null
  const placementIndex = globalIndexes[indexKey]
  globalIndexes[indexKey] = placementIndex + 1
  const placement: IndexedPlacement = [colToX(columnIndex), y, zOffset, placementIndex]
  return placement
}
