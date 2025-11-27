import {
  colToX,
  COLUMNS,
  createEmptyRingPositions,
  ON_TILE_Y,
  type IndexedPlacement,
  type RowData,
} from '@/utils/tiles'
import { HEADING_Y } from './floatingHeading'
import type { BitmapPlacement, SectionBitmapLayout, SectionBitmapRow } from './sectionBitmap'
import {
  COLLECTIBLES_CONTENT,
  FLOATING_HEADINGS_CONTENT,
  INFO_ZONES_CONTENT,
} from '@/resources/content'

type GlobalIndexes = {
  row: number
  heading: number
  infoZone: number
  collectible: number
}

type PlacementIndexKey = Exclude<keyof GlobalIndexes, 'row'>

export const buildRowsFromLayouts = (layouts: SectionBitmapLayout[]): RowData[] => {
  const globalIndexes: GlobalIndexes = {
    row: 0,
    heading: 0,
    infoZone: 0,
    collectible: 0,
  }

  const rows: RowData[] = []

  layouts.forEach((layout) => {
    const newRows = buildSectionRowsFromLayout({ layout, globalIndexes })
    rows.push(...newRows)
  })

  console.warn(
    `[SectionLayoutFeatures] Built ${rows.length} rows from ${layouts.length} layouts`,
    { globalIndexes },
  )
  if (globalIndexes.heading > FLOATING_HEADINGS_CONTENT.length) {
    console.error('More floating headings used than content available')
  }
  if (globalIndexes.infoZone > INFO_ZONES_CONTENT.length) {
    console.error('More info zones used than content available', {
      globalIndexes,
      infoContentLength: INFO_ZONES_CONTENT.length,
    })
  }
  if (globalIndexes.collectible > Object.keys(COLLECTIBLES_CONTENT).length) {
    console.error('More collectibles used than content available', { globalIndexes })
  }

  return rows
}

export function buildSectionRowsFromLayout({
  layout,
  globalIndexes,
  extraRowData,
}: {
  layout: SectionBitmapLayout
  globalIndexes: GlobalIndexes
  extraRowData?: (rowIndex: number, rowCount: number) => Partial<RowData>
}): RowData[] {
  const rowCount = layout.rowCount
  if (rowCount <= 0) return []

  const rows: RowData[] = new Array(rowCount)

  for (let rowIndex = 0; rowIndex < rowCount; rowIndex++) {
    const layoutRow = layout.rows[rowIndex]
    const heights = [...layoutRow.heights]

    const baseRow: RowData = {
      heights,
      stage: layout.stage,
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === rowCount - 1,
      isHighlighted: [],
      rowIndex: globalIndexes.row,
    }

    globalIndexes.row++

    const extra = !!extraRowData ? extraRowData(rowIndex, rowCount) : {}
    const row = { ...baseRow, ...extra }

    applyRingColumns(row, layoutRow.ringColumns)
    applyInfoColumns(row, layoutRow, globalIndexes)
    applyCollectiblePlacements(row, layoutRow, globalIndexes)
    applyFinishLineColumn(row, layoutRow)
    applyFloatingHeadingPlacement(row, layoutRow, globalIndexes)
    applyHighlightColumns(row, layoutRow.highlightColumns)

    rows[rowIndex] = row
  }

  return rows
}

function applyRingColumns(row: RowData, columns?: number[]) {
  if (!columns || columns.length === 0) return
  // TODO: review if this empty ring positions is needed.
  const ringPositions = row.ringPositions ?? createEmptyRingPositions()
  columns.forEach((columnIndex) => {
    if (columnIndex < 0 || columnIndex >= COLUMNS) return
    ringPositions[columnIndex] = 1
  })
  row.ringPositions = ringPositions
}

function applyInfoColumns(
  row: RowData,
  layoutRow: SectionBitmapRow,
  globalIndexes: GlobalIndexes,
) {
  const placements =
    buildPlacementsFromBitmap(
      layoutRow.infoZonePlacements,
      ON_TILE_Y,
      'infoZone',
      globalIndexes,
    ) ??
    buildPlacementsFromColumns(layoutRow.infoZoneColumns, ON_TILE_Y, 'infoZone', globalIndexes)

  if (placements?.length) {
    row.infoZonePlacements = placements
  }
}

function applyCollectiblePlacements(
  row: RowData,
  layoutRow: SectionBitmapRow,
  globalIndexes: GlobalIndexes,
) {
  const placements =
    buildPlacementsFromBitmap(
      layoutRow.collectiblePlacements,
      ON_TILE_Y,
      'collectible',
      globalIndexes,
    ) ??
    buildPlacementsFromColumns(
      layoutRow.collectibleColumns,
      ON_TILE_Y,
      'collectible',
      globalIndexes,
    )

  if (placements?.length) {
    row.collectiblePlacements = placements
  }
}

function applyFinishLineColumn(row: RowData, layoutRow: SectionBitmapRow) {
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
  layoutRow: SectionBitmapRow,
  globalIndexes: GlobalIndexes,
) {
  const placement = layoutRow.floatingHeadingPlacement
  if (!placement) return
  const { columnIndex, zOffset } = placement
  const indexedPlacement = createIndexedPlacement(
    columnIndex,
    zOffset,
    HEADING_Y,
    'heading',
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
  globalIndexes: GlobalIndexes,
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
  globalIndexes: GlobalIndexes,
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
  globalIndexes: GlobalIndexes,
): IndexedPlacement | null {
  if (columnIndex < 0 || columnIndex >= COLUMNS) return null
  const placementIndex = globalIndexes[indexKey]
  globalIndexes[indexKey] = placementIndex + 1
  const placement: IndexedPlacement = [colToX(columnIndex), y, zOffset, placementIndex]
  return placement
}
