import fs from 'fs'
import path from 'path'

import { GEM_COLOURS, INFO_ZONE_SPHERE_COLOURS } from '../../resources/colours'
import {
  type IndexedPlacement,
  type RowData,
  TILE_SIZE,
  clamp,
} from '../../utils/tiles'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const MINI_MAP_TILE_SIZE_PX = 4

type MiniMapPalette = {
  raised: string
  infoZone: string
  collectible: string
  background?: string
}

type MiniMapConfig = {
  tileSize?: number
  palette?: Partial<MiniMapPalette>
}

type MiniMapDimensions = {
  width: number
  height: number
}

type GenerateMiniMapParams = MiniMapConfig & {
  rows: RowData[]
  columns: number
}

type WriteMiniMapParams = GenerateMiniMapParams & {
  outputPath: string
}

const DEFAULT_PALETTE: MiniMapPalette = {
  raised: '#0D393B',
  infoZone: INFO_ZONE_SPHERE_COLOURS[0],
  collectible: GEM_COLOURS[0],
}

const getColumns = (columns: number, rows: RowData[]): number => {
  if (columns > 0) return columns
  const firstRowColumns = rows[0]?.isRaised.length ?? 0
  if (firstRowColumns <= 0) {
    throw new Error('Cannot determine column count for mini map generation')
  }
  return firstRowColumns
}

export const buildMiniMapSVG = ({
  rows,
  columns,
  tileSize = MINI_MAP_TILE_SIZE_PX,
  palette,
}: GenerateMiniMapParams): { svg: string } & MiniMapDimensions => {
  const columnCount = getColumns(columns, rows)
  const rowCount = rows.length
  if (rowCount === 0 || columnCount === 0) {
    return { svg: '', width: 0, height: 0 }
  }

  const { background, raised } = { ...DEFAULT_PALETTE, ...palette }
  const width = columnCount * tileSize
  const height = rowCount * tileSize
  const tiles: string[] = []
  const infoZoneTiles: string[] = []
  const collectibleTiles: string[] = []

  const infoZoneCells = collectIndicatorCells(
    rows,
    columnCount,
    (row) => row.infoZonePlacements,
  )
  const collectibleCells = collectIndicatorCells(
    rows,
    columnCount,
    (row) => row.collectiblePlacements,
  )

  rows.forEach((row, rowIndex) => {
    const y = (rowCount - 1 - rowIndex) * tileSize // bottom-up orientation
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const isRaised = (row.isRaised[columnIndex] ?? 0) === 1
      if (!isRaised) continue
      const x = columnIndex * tileSize
      tiles.push(
        `<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" fill="${raised}" />`,
      )
    }
  })

  infoZoneCells.forEach(({ rowIndex, columnIndex, contentIndex }) => {
    const y = (rowCount - 1 - rowIndex) * tileSize
    const x = columnIndex * tileSize
    const fill = getInfoZoneColour(contentIndex)
    infoZoneTiles.push(
      `<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" fill="${fill}" />`,
    )
  })

  collectibleCells.forEach(({ rowIndex, columnIndex, contentIndex }) => {
    const y = (rowCount - 1 - rowIndex) * tileSize
    const x = columnIndex * tileSize
    const fill = getCollectibleColour(contentIndex)
    collectibleTiles.push(
      `<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" fill="${fill}" />`,
    )
  })

  const svgParts = [
    `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
  ]

  if (!!background) {
    svgParts.push(`<rect width="${width}" height="${height}" fill="${background}" />`)
  }

  svgParts.push(...tiles, ...infoZoneTiles, ...collectibleTiles, '</svg>')

  const svg = svgParts.join('')

  return { svg, width, height }
}

export const writeMiniMapSVG = ({
  outputPath,
  ...params
}: WriteMiniMapParams): { outputPath: string } & MiniMapDimensions => {
  const { svg, width, height } = buildMiniMapSVG(params)
  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, svg, 'utf8')
  return { outputPath, width, height }
}

export const MINI_MAP_CONSTANTS = {
  TILE_SIZE_PX: MINI_MAP_TILE_SIZE_PX,
}

type IndicatorCell = {
  rowIndex: number
  columnIndex: number
  contentIndex?: number
}

const getColumnIndexFromX = (x: number, columnCount: number): number | null => {
  const rawColumn = x / TILE_SIZE + columnCount / 2 - 0.5
  if (!Number.isFinite(rawColumn)) return null
  return clamp(Math.round(rawColumn), 0, columnCount - 1)
}

const getRowIndexFromRelativeZ = (
  rowIndex: number,
  relativeZ: number,
  rowCount: number,
): number | null => {
  const rawRow = rowIndex - relativeZ / TILE_SIZE
  if (!Number.isFinite(rawRow)) return null
  return clamp(Math.round(rawRow), 0, rowCount - 1)
}

const collectIndicatorCells = (
  rows: RowData[],
  columnCount: number,
  getPlacements: (row: RowData) => IndexedPlacement[] | undefined,
): IndicatorCell[] => {
  const rowCount = rows.length
  const seen = new Set<string>()
  const cells: IndicatorCell[] = []

  rows.forEach((row, rowIndex) => {
    const placements = getPlacements(row)
    if (!placements?.length) return

    placements.forEach((placement) => {
      const [x, , relativeZ, contentIndex] = placement
      const targetRow = getRowIndexFromRelativeZ(rowIndex, relativeZ, rowCount)
      const columnIndex = getColumnIndexFromX(x, columnCount)

      if (targetRow == null || columnIndex == null) return

      const key = `${targetRow}:${columnIndex}`
      if (seen.has(key)) return
      seen.add(key)
      cells.push({ rowIndex: targetRow, columnIndex, contentIndex })
    })
  })

  return cells
}

function getInfoZoneColour(contentIndex: number | undefined): string {
  if (!INFO_ZONE_SPHERE_COLOURS.length) return '#FFFFFF'
  const index = typeof contentIndex === 'number' ? contentIndex : 0
  const wrappedIndex =
    ((index % INFO_ZONE_SPHERE_COLOURS.length) + INFO_ZONE_SPHERE_COLOURS.length) %
    INFO_ZONE_SPHERE_COLOURS.length
  return INFO_ZONE_SPHERE_COLOURS[wrappedIndex]
}

function getCollectibleColour(contentIndex: number | undefined): string {
  if (!GEM_COLOURS.length) return '#FFFFFF'
  const index = typeof contentIndex === 'number' ? contentIndex : 0
  const wrappedIndex = ((index % GEM_COLOURS.length) + GEM_COLOURS.length) % GEM_COLOURS.length
  return GEM_COLOURS[wrappedIndex]
}
