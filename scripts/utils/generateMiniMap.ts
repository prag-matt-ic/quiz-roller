import fs from 'fs'
import path from 'path'

import { type RowData, UNSAFE_HEIGHT } from '../../utils/tiles'

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'
const MINI_MAP_TILE_SIZE_PX = 4
const RAISED_HEIGHT_THRESHOLD = UNSAFE_HEIGHT + 1 // anything above sunken height is considered raised

type MiniMapPalette = {
  raised: string
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
  raised: '#15746C',
}

const getColumns = (columns: number, rows: RowData[]): number => {
  if (columns > 0) return columns
  const firstRowColumns = rows[0]?.heights.length ?? 0
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

  rows.forEach((row, rowIndex) => {
    const y = (rowCount - 1 - rowIndex) * tileSize // bottom-up orientation
    for (let columnIndex = 0; columnIndex < columnCount; columnIndex++) {
      const heightValue = row.heights[columnIndex]
      if (heightValue == null || heightValue <= RAISED_HEIGHT_THRESHOLD) continue
      const x = columnIndex * tileSize
      tiles.push(
        `<rect x="${x}" y="${y}" width="${tileSize}" height="${tileSize}" fill="${raised}" />`,
      )
    }
  })

  const svgParts = [
    `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">`,
  ]

  if (background) {
    svgParts.push(`<rect width="${width}" height="${height}" fill="${background}" />`)
  }

  svgParts.push(...tiles, '</svg>')

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
