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
const INFO_ZONE_START_COLUMN = COLUMNS - INFO_ZONE_COLS
const INFO_ZONE_CENTER_COLUMN = INFO_ZONE_START_COLUMN + (INFO_ZONE_COLS - 1) / 2
export const INFO_ZONE_WIDTH = INFO_ZONE_COLS * TILE_SIZE
export const INFO_ZONE_HEIGHT = INFO_ZONE_ROWS * TILE_SIZE

// TODO: update to include the infoZone position, floating heading position....
export function generateInfoSectionRowData(contentIndex: 0 | 1 | 2): RowData[] {
  // Start fully open, then carve out non-tile areas within tile rows
  const heights: number[][] = Array.from({ length: INFO_SECTION_ROWS }, () =>
    new Array<number>(COLUMNS).fill(SAFE_HEIGHT),
  )

  // Floating header appears at the top of the section
  const floatingHeaderCenterRow = 3
  const floatingHeaderTriggerRow = Math.ceil(floatingHeaderCenterRow)
  const floatingHeaderZRelative =
    (floatingHeaderTriggerRow - floatingHeaderCenterRow) * TILE_SIZE

  // Info zone appears at the same level as the header, but on the right side
  const infoZoneCenterRow = 2
  const infoZoneTriggerRow = Math.ceil(infoZoneCenterRow)
  const infoZoneZRelative = (infoZoneTriggerRow - infoZoneCenterRow) * TILE_SIZE
  const infoZoneHighlightStartColumn = clampRangeStart(
    INFO_ZONE_START_COLUMN,
    INFO_ZONE_COLS,
    COLUMNS,
  )
  const infoZoneHighlightEndColumn = Math.min(
    COLUMNS,
    infoZoneHighlightStartColumn + INFO_ZONE_COLS,
  )
  const protectedRanges: ProtectRange[] = []
  const infoZoneHighlightStartRow = clampRangeStart(
    Math.ceil(infoZoneCenterRow - INFO_ZONE_ROWS / 2),
    INFO_ZONE_ROWS,
    INFO_SECTION_ROWS,
  )
  const infoZoneHighlightEndRow = Math.min(
    INFO_SECTION_ROWS,
    infoZoneHighlightStartRow + INFO_ZONE_ROWS,
  )
  const infoZoneHighlightTemplate =
    infoZoneHighlightEndColumn > infoZoneHighlightStartColumn
      ? buildHighlightTemplate(infoZoneHighlightStartColumn, infoZoneHighlightEndColumn)
      : null

  if (infoZoneHighlightEndColumn > infoZoneHighlightStartColumn) {
    protectedRanges.push({
      startCol: infoZoneHighlightStartColumn,
      endColExclusive: infoZoneHighlightEndColumn,
    })
  }

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
      rows[i].infoZonePositions = [
        [colToX(INFO_ZONE_CENTER_COLUMN), ON_TILE_Y, infoZoneZRelative], // Positioned to the right (offset by 3 columns)
      ]
    }

    const shouldHighlightInfoZoneRow =
      infoZoneHighlightTemplate !== null &&
      i >= infoZoneHighlightStartRow &&
      i < infoZoneHighlightEndRow

    if (shouldHighlightInfoZoneRow && infoZoneHighlightTemplate !== null) {
      rows[i].isHighlighted = infoZoneHighlightTemplate.slice()
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
