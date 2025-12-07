/**
 * PLATFORM ROW DATA BUILDER
 *
 * Generates precomputed platform row data from bitmap layouts.
 * - Detects latest version folder in ./assets/platform/{semver}/
 * - Parses bitmaps for each game mode and writes resources/rowsData.ts
 * - Speeds up runtime by skipping client-side bitmap parsing
 *
 * HOW TO RUN:
 *   npm run build-platform-data
 *
 * OUTPUT:
 *   resources/rowsData.ts with PLATFORM_DATA containing rows + totalCounts per mode.
 *   public/maps/{version}/{mode}.svg mini map assets (one per GameMode).
 */
/* eslint-disable no-console */
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

import { type TotalCounts, createTotalCounts } from '../stores/totalCounts'
import { GameMode, Stage } from '../stores/types'
import { HEADING_Y } from '../utils/platform/floatingHeading'
import {
  COLUMNS,
  CONFETTI_ROW_DEPTH,
  type ConfettiPlacement,
  type IndexedPlacement,
  ON_TILE_Y,
  type RowData,
  TILE_SIZE,
  colToX,
} from '../utils/tiles'
import { MINI_MAP_CONSTANTS, writeMiniMapSVG } from './utils/generateMiniMap'

type BitmapPlacement = {
  columnIndex: number
  zOffset: number
}

type BitmapRow = {
  isRaised: (0 | 1)[]
  highlightColumns: number[]
  ringColumns: number[]
  infoZoneColumns: number[]
  collectibleColumns: number[]
  finishLineColumns: number[]
  floatingHeadingColumns: number[]
  confettiColumns: number[]
  infoZonePlacements?: BitmapPlacement[]
  collectiblePlacements?: BitmapPlacement[]
  finishLinePlacement?: BitmapPlacement | null
  floatingHeadingPlacement?: BitmapPlacement | null
  confettiPlacements?: BitmapPlacement[]
}

type ModeRows = {
  rows: RowData[]
  totalCounts: TotalCounts
}

type SectionSource = {
  file: string
  stage: Stage
}

const PLATFORM_ROOT = path.join(process.cwd(), 'assets', 'platform')
const OUTPUT_PATH = path.join(process.cwd(), 'resources', 'rowsData.ts')
const MINIMAP_BASE_DIR = path.join(process.cwd(), 'public', 'maps')

const CORE_SOURCES: SectionSource[] = [
  { file: 'home.png', stage: Stage.HOME },
  { file: 'obstacles-1.png', stage: Stage.OBSTACLES },
  { file: 'info-1.png', stage: Stage.INFO },
  { file: 'obstacles-2.png', stage: Stage.OBSTACLES },
  { file: 'info-2.png', stage: Stage.INFO },
  { file: 'obstacles-3.png', stage: Stage.OBSTACLES },
  { file: 'info-3.png', stage: Stage.INFO },
  { file: 'obstacles-4.png', stage: Stage.OBSTACLES },
]

const MODE_SOURCES: Record<GameMode, SectionSource[]> = {
  [GameMode.LEARN]: [...CORE_SOURCES, { file: 'cta.png', stage: Stage.CTA }],
  [GameMode.SPEEDRUN]: [
    ...CORE_SOURCES,
    { file: 'speed-run-finish.png', stage: Stage.SPEED_RUN_FINISH },
  ],
  [GameMode.DEV]: [
    { file: 'test.png', stage: Stage.HOME },
    { file: 'cta.png', stage: Stage.CTA },
  ],
}

const COLOUR_CODES = {
  VOID: [0, 0, 0] as const,
  RING: [255, 0, 0] as const,
  FLOATING_HEADING: [128, 128, 128] as const,
  INFO_ZONE: [0, 255, 0] as const,
  COLLECTIBLE: [0, 0, 255] as const,
  HIGHLIGHT: [0, 255, 255] as const,
  FINISH_LINE: [255, 255, 0] as const,
  CONFETTI: [255, 0, 128] as const,
}

const NEIGHBOUR_OFFSETS: Array<[number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
]

const looksLikeVersion = (value: string) => /^\d+\.\d+\.\d+$/.test(value)

function isColour(r: number, g: number, b: number, [cr, cg, cb]: readonly number[]): boolean {
  return r === cr && g === cg && b === cb
}

function compareVersions(a: string, b: string): number {
  const partsA = a.split('.').map(Number)
  const partsB = b.split('.').map(Number)
  const length = Math.max(partsA.length, partsB.length)

  for (let i = 0; i < length; i++) {
    const aPart = partsA[i] ?? 0
    const bPart = partsB[i] ?? 0
    if (aPart !== bPart) return bPart - aPart
  }

  return 0
}

function findVersionDirectory(basePath: string): { version: string; directory: string } {
  const absoluteBase = path.resolve(basePath)
  if (!fs.existsSync(absoluteBase)) {
    throw new Error(`Platform root not found at ${absoluteBase}`)
  }
  const stat = fs.statSync(absoluteBase)
  if (!stat.isDirectory()) {
    throw new Error(`Platform root must be a directory: ${absoluteBase}`)
  }

  const baseName = path.basename(absoluteBase)
  if (looksLikeVersion(baseName)) {
    return { version: baseName, directory: absoluteBase }
  }

  const candidates = fs
    .readdirSync(absoluteBase, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)

  if (!candidates.length) {
    throw new Error(`No versioned platform folders found in ${absoluteBase}`)
  }

  const sorted = candidates.sort(compareVersions)
  const version = sorted[0]!
  return { version, directory: path.join(absoluteBase, version) }
}

function formatModeData({ rows, totalCounts }: ModeRows): string {
  return `{ rows: ${JSON.stringify(rows)}, totalCounts: ${JSON.stringify(totalCounts)} }`
}

function buildOutputFile({
  version,
  modes,
}: {
  version: string
  modes: Record<GameMode, ModeRows>
}): string {
  return `/* eslint-disable */
import { GameMode } from '@/stores/types'
import type { TotalCounts } from '@/stores/totalCounts'
import type { RowData } from '@/utils/tiles'

export type PlatformModeData = {
  rows: RowData[]
  totalCounts: TotalCounts
}

export type PlatformRowsData = {
  version: string
  modes: Record<GameMode, PlatformModeData>
}

export const PLATFORM_DATA: PlatformRowsData = {
  version: '${version}',
  modes: {
    [GameMode.LEARN]: ${formatModeData(modes[GameMode.LEARN])},
    [GameMode.SPEEDRUN]: ${formatModeData(modes[GameMode.SPEEDRUN])},
    [GameMode.DEV]: ${formatModeData(modes[GameMode.DEV])},
  },
}
export const PLATFORM_VERSION = PLATFORM_DATA.version
`
}

async function parseSectionBitmapFromFile(
  filePath: string,
  stage: Stage,
  totalCounts: TotalCounts,
): Promise<RowData[]> {
  const image = sharp(filePath)
  const metadata = await image.metadata()
  const imageHeight = metadata.height
  const imageWidth = metadata.width

  if (!imageHeight || !imageWidth) {
    throw new Error(`Bitmap image missing dimensions: ${filePath}`)
  }

  const { data, info } = await image
    .resize(COLUMNS, imageHeight, { fit: 'fill' })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const width = info.width
  const height = info.height
  const channels = info.channels

  if (width !== COLUMNS) {
    throw new Error(`Expected resized width of ${COLUMNS}, got ${width} for ${filePath}`)
  }

  const rows: BitmapRow[] = new Array(height)

  for (let srcRow = 0; srcRow < height; srcRow++) {
    const rowIndex = height - 1 - srcRow
    const raisedMask = new Array(width).fill(0) as (0 | 1)[]
    const ringColumns: number[] = []
    const infoZoneColumns: number[] = []
    const highlightColumns: number[] = []
    const collectibleColumns: number[] = []
    const finishLineColumns: number[] = []
    const floatingHeadingColumns: number[] = []
    const confettiColumns: number[] = []

    for (let column = 0; column < width; column++) {
      const pixelIndex = (srcRow * width + column) * channels
      const r = data[pixelIndex]
      const g = data[pixelIndex + 1]
      const b = data[pixelIndex + 2]

      const isRaised = !isColour(r, g, b, COLOUR_CODES.VOID)
      raisedMask[column] = isRaised ? 1 : 0

      if (isColour(r, g, b, COLOUR_CODES.RING)) ringColumns.push(column)
      if (isColour(r, g, b, COLOUR_CODES.INFO_ZONE)) infoZoneColumns.push(column)
      if (isColour(r, g, b, COLOUR_CODES.COLLECTIBLE)) collectibleColumns.push(column)
      if (isColour(r, g, b, COLOUR_CODES.FINISH_LINE)) finishLineColumns.push(column)
      if (isColour(r, g, b, COLOUR_CODES.HIGHLIGHT)) highlightColumns.push(column)
      if (isColour(r, g, b, COLOUR_CODES.FLOATING_HEADING)) floatingHeadingColumns.push(column)
      if (isColour(r, g, b, COLOUR_CODES.CONFETTI)) confettiColumns.push(column)
    }

    rows[rowIndex] = {
      isRaised: raisedMask,
      ringColumns,
      infoZoneColumns,
      collectibleColumns,
      finishLineColumns,
      highlightColumns,
      floatingHeadingColumns,
      confettiColumns,
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

  assignBitmapPlacements(
    rows,
    (row) => row.confettiColumns,
    (rowIndex, placements) => {
      if (!placements.length) return
      rows[rowIndex].confettiPlacements = placements
    },
  )

  const totalRingsCount = rows.reduce((count, row) => count + row.ringColumns.length, 0)
  const rowData = buildRowDataFromBitmapRows({ rows, stage, globalIndexes: totalCounts })
  totalCounts.rings += totalRingsCount

  return rowData
}

type ColumnsAccessor = (row: BitmapRow) => number[]
type PlacementAssigner = (rowIndex: number, placements: BitmapPlacement[]) => void

function assignBitmapPlacements(
  rows: BitmapRow[],
  getColumns: ColumnsAccessor,
  assignPlacements: PlacementAssigner,
) {
  const rowCount = rows.length
  if (rowCount === 0) return

  const columnSets = rows.map((row) => new Set(getColumns(row)))
  const visited = new Set<string>()
  const placementsByRow = new Map<number, BitmapPlacement[]>()
  const keyFor = (row: number, column: number) => `${row}:${column}`

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
      isRaised: layoutRow.isRaised,
      stage,
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === rowCount - 1,
      isHighlighted: new Array<number>(COLUMNS).fill(0),
      rowIndex: globalIndexes.rows,
    }

    globalIndexes.rows++

    applyRingColumns(baseRow, layoutRow.ringColumns)
    applyInfoColumns(baseRow, layoutRow, globalIndexes)
    applyCollectiblePlacements(baseRow, layoutRow, globalIndexes)
    applyFinishLineColumn(baseRow, layoutRow)
    applyFloatingHeadingPlacement(baseRow, layoutRow, globalIndexes)
    applyHighlightColumns(baseRow, layoutRow.highlightColumns)
    applyConfettiPlacements(baseRow, layoutRow, globalIndexes)

    rowData[rowIndex] = baseRow
  }

  return rowData
}

function applyRingColumns(row: RowData, columns?: number[]) {
  if (!columns || columns.length === 0) return
  const rings = new Array<number>(COLUMNS).fill(0) as (0 | 1)[]
  columns.forEach((columnIndex) => {
    if (columnIndex < 0 || columnIndex >= COLUMNS) return
    rings[columnIndex] = 1
  })
  row.rings = rings
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
  const highlights = row.isHighlighted ?? new Array<number>(COLUMNS).fill(0)
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

function applyConfettiPlacements(
  row: RowData,
  layoutRow: BitmapRow,
  globalIndexes: TotalCounts,
) {
  const placements =
    buildConfettiPlacementsFromBitmap(layoutRow, globalIndexes) ??
    buildConfettiPlacementsFromColumns(layoutRow, globalIndexes)

  if (placements?.length) {
    row.confettiPlacements = placements
  }
}

function buildPlacementsFromBitmap(
  placements: BitmapPlacement[] | undefined,
  y: number,
  indexKey: keyof TotalCounts & Exclude<keyof TotalCounts, 'rows' | 'rings'>,
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

function buildConfettiPlacementsFromBitmap(
  layoutRow: BitmapRow,
  globalIndexes: TotalCounts,
): RowData['confettiPlacements'] | undefined {
  const placements = layoutRow.confettiPlacements
  if (!placements?.length) return undefined

  const raisedSpan = getRaisedSpanForRow(layoutRow.isRaised)
  if (!raisedSpan) return undefined

  const confettiPlacements: RowData['confettiPlacements'] = []
  placements.forEach(({ zOffset }) => {
    const placement = createConfettiPlacement({
      zOffset,
      raisedSpan,
      globalIndexes,
    })
    if (placement) {
      confettiPlacements.push(placement)
    }
  })
  return confettiPlacements.length > 0 ? confettiPlacements : undefined
}

function buildConfettiPlacementsFromColumns(
  layoutRow: BitmapRow,
  globalIndexes: TotalCounts,
): RowData['confettiPlacements'] | undefined {
  const { confettiColumns } = layoutRow
  if (!confettiColumns?.length) return undefined

  const raisedSpan = getRaisedSpanForRow(layoutRow.isRaised)
  if (!raisedSpan) return undefined

  const placement = createConfettiPlacement({
    zOffset: 0,
    raisedSpan,
    globalIndexes,
  })

  return placement ? [placement] : undefined
}

function createConfettiPlacement({
  zOffset,
  raisedSpan,
  globalIndexes,
}: {
  zOffset: number
  raisedSpan: { centerX: number; width: number; depth: number }
  globalIndexes: TotalCounts
}): ConfettiPlacement | null {
  const contentIndex = globalIndexes.confetti
  globalIndexes.confetti += 1

  return {
    position: [raisedSpan.centerX, ON_TILE_Y, zOffset],
    width: raisedSpan.width,
    depth: raisedSpan.depth,
    contentIndex,
  }
}

function getRaisedSpanForRow(
  raisedMask: (0 | 1)[],
): { centerX: number; width: number; depth: number } | null {
  let minColumn = Infinity
  let maxColumn = -Infinity

  raisedMask.forEach((value, columnIndex) => {
    if (value !== 1) return
    if (columnIndex < minColumn) minColumn = columnIndex
    if (columnIndex > maxColumn) maxColumn = columnIndex
  })

  if (!Number.isFinite(minColumn) || !Number.isFinite(maxColumn)) return null

  const centerColumn = (minColumn + maxColumn) * 0.5
  const width = (maxColumn - minColumn + 1) * TILE_SIZE

  return {
    centerX: colToX(centerColumn),
    width,
    depth: CONFETTI_ROW_DEPTH,
  }
}

function buildPlacementsFromColumns(
  columns: number[] | undefined,
  y: number,
  indexKey: keyof TotalCounts & Exclude<keyof TotalCounts, 'rows' | 'rings'>,
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
  indexKey: keyof TotalCounts & Exclude<keyof TotalCounts, 'rows' | 'rings'>,
  globalIndexes: TotalCounts,
): IndexedPlacement | null {
  if (columnIndex < 0 || columnIndex >= COLUMNS) return null
  const placementIndex = globalIndexes[indexKey]
  globalIndexes[indexKey] = placementIndex + 1
  const placement: IndexedPlacement = [colToX(columnIndex), y, zOffset, placementIndex]
  return placement
}

async function buildModeData(
  versionDirectory: string,
  sources: SectionSource[],
): Promise<ModeRows> {
  const totalCounts = createTotalCounts()
  const rows: RowData[] = []

  for (const source of sources) {
    const filePath = path.join(versionDirectory, source.file)
    if (!fs.existsSync(filePath)) {
      throw new Error(`Missing platform bitmap: ${filePath}`)
    }
    const parsedRows = await parseSectionBitmapFromFile(filePath, source.stage, totalCounts)
    rows.push(...parsedRows)
  }

  return { rows, totalCounts }
}

function writeMiniMapAssets(modes: Record<GameMode, ModeRows>, version: string) {
  const miniMapVersionDir = path.join(MINIMAP_BASE_DIR, version)
  fs.mkdirSync(miniMapVersionDir, { recursive: true })

  const modeEntries = Object.entries(modes) as Array<[GameMode, ModeRows]>
  modeEntries.forEach(([mode, modeRows]) => {
    const outputPath = path.join(miniMapVersionDir, `${mode}.svg`)
    const { width, height } = writeMiniMapSVG({
      rows: modeRows.rows,
      columns: COLUMNS,
      tileSize: MINI_MAP_CONSTANTS.TILE_SIZE_PX,
      outputPath,
    })
    console.log(`🗺️  Generated mini map for ${mode} (${width}x${height}) at ${outputPath}`)
  })
}

async function main() {
  const { version, directory } = findVersionDirectory(PLATFORM_ROOT)

  console.log(`🛠️  Generating platform rows for version ${version}`)

  const modes: Record<GameMode, ModeRows> = {
    [GameMode.LEARN]: await buildModeData(directory, MODE_SOURCES[GameMode.LEARN]),
    [GameMode.SPEEDRUN]: await buildModeData(directory, MODE_SOURCES[GameMode.SPEEDRUN]),
    [GameMode.DEV]: await buildModeData(directory, MODE_SOURCES[GameMode.DEV]),
  }

  writeMiniMapAssets(modes, version)

  const output = buildOutputFile({ version, modes })
  fs.writeFileSync(OUTPUT_PATH, output)

  console.log(`✅ Wrote platform rows to ${OUTPUT_PATH}`)
}

main().catch((error) => {
  console.error('❌ Failed to generate platform rows')
  console.error(error)
  process.exit(1)
})
