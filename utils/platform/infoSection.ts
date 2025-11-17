import {
  colToX,
  COLUMNS,
  ON_TILE_Y,
  RowData,
  SAFE_HEIGHT,
  TILE_SIZE,
  UNSAFE_HEIGHT,
} from '@/utils/tiles'

export const FIRST_OBSTACLE_SECTION_ROWS = 16
export const OBSTACLE_SECTION_ROWS = 48

// Answer tile fixed sizing (in world units, aligned to grid columns/rows)
export const INFO_SECTION_ROWS = 12
export const INFO_TEXT_WIDTH = 8 * TILE_SIZE
export const INFO_TEXT_ROWS = 4
export const INFO_TEXT_HEIGHT = INFO_TEXT_ROWS * TILE_SIZE
export const HEADER_FLOAT_HEIGHT = 5
export const INFO_ZONE_CENTER_ROW = 6

// TODO: update to include the infoZone position, floating heading position....
export function generateInfoSectionRowData(contentIndex: 0 | 1 | 2): RowData[] {
  // Start fully open, then carve out non-tile areas within tile rows
  const heights: number[][] = Array.from({ length: INFO_SECTION_ROWS }, () =>
    new Array<number>(COLUMNS).fill(SAFE_HEIGHT),
  )

  // Text appears first, then answers further down the section
  const infoTextCenterRow = 3.5
  const textTriggerRow = Math.ceil(infoTextCenterRow + INFO_TEXT_ROWS / 2)
  const textZRelative = (textTriggerRow - infoTextCenterRow) * TILE_SIZE

  // Floating header appears at the top of the section
  const floatingHeaderCenterRow = 1.5
  const floatingHeaderTriggerRow = Math.ceil(floatingHeaderCenterRow)
  const floatingHeaderZRelative =
    (floatingHeaderTriggerRow - floatingHeaderCenterRow) * TILE_SIZE

  // Info zone appears at the same level as the header, but on the right side
  const infoZoneCenterRow = 1.5
  const infoZoneTriggerRow = Math.ceil(infoZoneCenterRow)
  const infoZoneZRelative = (infoZoneTriggerRow - infoZoneCenterRow) * TILE_SIZE

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
        HEADER_FLOAT_HEIGHT,
        floatingHeaderZRelative,
      ]
    }

    if (i === infoZoneTriggerRow) {
      rows[i].infoZonePositions = [
        [colToX(COLUMNS / 2 + 3), ON_TILE_Y, infoZoneZRelative], // Positioned to the right (offset by 3 columns)
      ]
    }

    if (i === textTriggerRow) {
      rows[i].tileTextPosition = [colToX(COLUMNS / 2 - 0.5), ON_TILE_Y, textZRelative]
    }
  }
  return rows
}
