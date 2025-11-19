import { colToX, COLUMNS, ON_TILE_Y, RowData, SAFE_HEIGHT, TILE_SIZE } from '@/utils/tiles'
import { roughenEdges, type ProtectRange } from './roughenEdges'
import { HEADING_Y } from './floatingHeading'

export const FIRST_OBSTACLE_SECTION_ROWS = 16
export const OBSTACLE_SECTION_ROWS = 48

// Answer tile fixed sizing (in world units, aligned to grid columns/rows)
export const INFO_SECTION_ROWS = 16

export const INFO_ZONE_CENTER_ROW = 10
const INFO_ZONE_COLS = 5
const INFO_ZONE_ROWS = 5

const RIGHT_INFO_ZONE_START_COLUMN = COLUMNS - INFO_ZONE_COLS - 2 // right side, one column from edge
const RIGHT_INFO_ZONE_CENTER_COLUMN = RIGHT_INFO_ZONE_START_COLUMN + (INFO_ZONE_COLS - 1) / 2
const LEFT_INFO_ZONE_START_COLUMN = 2 // left side, one column from edge
const LEFT_INFO_ZONE_CENTER_COLUMN = LEFT_INFO_ZONE_START_COLUMN + (INFO_ZONE_COLS - 1) / 2

export const INFO_ZONE_WIDTH = INFO_ZONE_COLS * TILE_SIZE
export const INFO_ZONE_HEIGHT = INFO_ZONE_ROWS * TILE_SIZE

type InfoZone = {
  contentIndex: 0 | 1 | 2
  isInfoOnLeft: boolean
}

export function generateInfoSectionRowData(config: InfoZone): RowData[] {
  const { contentIndex, isInfoOnLeft } = config

  // Start fully open, then carve out non-tile areas within tile rows
  const heights: number[][] = Array.from({ length: INFO_SECTION_ROWS }, () =>
    new Array<number>(COLUMNS).fill(SAFE_HEIGHT),
  )

  // Floating header appears at the top of the section
  const floatingHeaderCenterRow = 3
  const floatingHeaderTriggerRow = Math.ceil(floatingHeaderCenterRow)
  const floatingHeaderZRelative =
    (floatingHeaderTriggerRow - floatingHeaderCenterRow) * TILE_SIZE

  // Info zones appear at the same row
  const infoZoneTriggerRow = Math.ceil(INFO_ZONE_CENTER_ROW)
  const infoZoneZRelative = (infoZoneTriggerRow - INFO_ZONE_CENTER_ROW) * TILE_SIZE

  // Calculate highlight ranges for both zones using a loop
  const zonePositions = [
    { startColumn: LEFT_INFO_ZONE_START_COLUMN, centerColumn: LEFT_INFO_ZONE_CENTER_COLUMN },
    { startColumn: RIGHT_INFO_ZONE_START_COLUMN, centerColumn: RIGHT_INFO_ZONE_CENTER_COLUMN },
  ]

  const highlightData = zonePositions.map((zone) => {
    const startColumn = clampRangeStart(zone.startColumn, INFO_ZONE_COLS, COLUMNS)
    const endColumn = Math.min(COLUMNS, startColumn + INFO_ZONE_COLS)
    const template =
      endColumn > startColumn ? buildHighlightTemplate(startColumn, endColumn) : null
    return { startColumn, endColumn, template }
  })

  const protectedRanges: ProtectRange[] = []
  const infoZoneHighlightStartRow = clampRangeStart(
    Math.ceil(INFO_ZONE_CENTER_ROW - INFO_ZONE_ROWS / 2),
    INFO_ZONE_ROWS,
    INFO_SECTION_ROWS,
  )
  const infoZoneHighlightEndRow = Math.min(
    INFO_SECTION_ROWS,
    infoZoneHighlightStartRow + INFO_ZONE_ROWS,
  )

  // Add protected ranges for both zones
  highlightData.forEach(({ startColumn, endColumn }) => {
    if (endColumn > startColumn) {
      protectedRanges.push({
        startCol: startColumn,
        endColExclusive: endColumn,
      })
    }
  })

  const rows: RowData[] = new Array(INFO_SECTION_ROWS)

  for (let i = 0; i < INFO_SECTION_ROWS; i++) {
    const isStart = i === 0
    const isEnd = i === INFO_SECTION_ROWS - 1

    rows[i] = {
      heights: heights[i],
      type: 'info',
      isSectionStart: isStart,
      isSectionEnd: isEnd,
      infoContentIndex: contentIndex,
    }

    if (i === floatingHeaderTriggerRow) {
      rows[i].floatingHeadingPosition = [
        colToX(COLUMNS / 2 - 0.5),
        HEADING_Y,
        floatingHeaderZRelative,
      ]
    }

    if (i === infoZoneTriggerRow) {
      // Index 0 = collectible zone, Index 1 = info zone
      const collectiblePosition = isInfoOnLeft
        ? RIGHT_INFO_ZONE_CENTER_COLUMN
        : LEFT_INFO_ZONE_CENTER_COLUMN
      const infoPosition = isInfoOnLeft
        ? LEFT_INFO_ZONE_CENTER_COLUMN
        : RIGHT_INFO_ZONE_CENTER_COLUMN

      rows[i].collectiblePosition = [colToX(collectiblePosition), ON_TILE_Y, infoZoneZRelative]
      rows[i].infoZonePositions = [[colToX(infoPosition), ON_TILE_Y, infoZoneZRelative]]
    }

    // Check if we should highlight on this row
    const inCurrentRowRange = i >= infoZoneHighlightStartRow && i < infoZoneHighlightEndRow
    if (inCurrentRowRange) {
      const combinedHighlight = new Array<number>(COLUMNS).fill(0)

      // Apply both zone highlights
      highlightData.forEach(({ template }) => {
        if (template !== null) {
          for (let col = 0; col < COLUMNS; col++) {
            combinedHighlight[col] = combinedHighlight[col] || template[col]
          }
        }
      })

      rows[i].isHighlighted = combinedHighlight
    }
  }
  roughenEdges({
    rows,
    seed: 50 + contentIndex * 101,
    protectRanges: protectedRanges,
    rowWindow: {
      start: 1,
      endExclusive: INFO_SECTION_ROWS - 1,
    },
    maxIndentColumns: 3,
  })
  return rows
}

function clampRangeStart(requestedStart: number, span: number, maxExclusive: number): number {
  if (span >= maxExclusive) return 0
  const minStart = 0
  const maxStart = maxExclusive - span
  if (requestedStart < minStart) return minStart
  if (requestedStart > maxStart) return maxStart
  return requestedStart
}

function buildHighlightTemplate(startColumn: number, endColumnExclusive: number): number[] {
  const highlight = new Array<number>(COLUMNS).fill(0)
  for (let columnIndex = startColumn; columnIndex < endColumnExclusive; columnIndex++) {
    highlight[columnIndex] = 1
  }
  return highlight
}
