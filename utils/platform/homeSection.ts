import { type Vector3Tuple } from 'three'
import {
  colToX,
  COLUMNS,
  ON_TILE_Y,
  type RowData,
  SAFE_HEIGHT,
  TILE_SIZE,
  UNSAFE_HEIGHT,
} from '@/utils/tiles'

const HOME_SECTION_ROWS = 16

const IMAGE_CENTER_ROW = 5
const IMAGE_TRIGGER_ROW = IMAGE_CENTER_ROW
const IMAGE_RELATIVE_Z = 0

const INFO_ZONE_COLS = 2
const INFO_ZONE_ROWS = 3
const INFO_ZONE_CENTER_ROW = 5
const INFO_ZONE_TRIGGER_ROW = Math.round(INFO_ZONE_CENTER_ROW)
const INFO_ZONE_RELATIVE_Z = (INFO_ZONE_TRIGGER_ROW - INFO_ZONE_CENTER_ROW) * TILE_SIZE
const INFO_ZONE_RIGHT_START_COL = COLUMNS - INFO_ZONE_COLS - 1
const INFO_ZONE_RIGHT_CENTER_COL = INFO_ZONE_RIGHT_START_COL + (INFO_ZONE_COLS - 1) / 2
const INFO_ZONE_LEFT_START_COL = 1
const INFO_ZONE_LEFT_CENTER_COL = INFO_ZONE_LEFT_START_COL + (INFO_ZONE_COLS - 1) / 2

const INFO_ZONE_POSITIONS: [number, number, number][] = [
  [colToX(INFO_ZONE_RIGHT_CENTER_COL), ON_TILE_Y, INFO_ZONE_RELATIVE_Z],
  [colToX(INFO_ZONE_LEFT_CENTER_COL), ON_TILE_Y, INFO_ZONE_RELATIVE_Z],
]

export const INFO_ZONE_WIDTH = INFO_ZONE_COLS * TILE_SIZE
export const INFO_ZONE_HEIGHT = INFO_ZONE_ROWS * TILE_SIZE

// TODO: add floating heading position.
export function generateHomeSectionRowData(): RowData[] {
  const rows: RowData[] = new Array(HOME_SECTION_ROWS)

  for (let rowIndex = 0; rowIndex < HOME_SECTION_ROWS; rowIndex++) {
    const heights = new Array<number>(COLUMNS).fill(SAFE_HEIGHT)

    rows[rowIndex] = {
      heights,
      type: 'home',
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === HOME_SECTION_ROWS - 1,
    }

    if (rowIndex === IMAGE_TRIGGER_ROW) {
      rows[rowIndex].imagePosition = [colToX(COLUMNS / 2 - 0.5), ON_TILE_Y, IMAGE_RELATIVE_Z]
    }

    // TODO: remove info zone from home section.
    if (rowIndex === INFO_ZONE_TRIGGER_ROW) {
      rows[rowIndex].infoZonePositions = INFO_ZONE_POSITIONS
    }
  }

  return rows
}

// Colour picker config
export const COLOUR_TILE_SIZE = TILE_SIZE * 2
export const COLOUR_TILE_GAP = TILE_SIZE
// export const COLOUR_TILE_TEXT_RELATIVE_Z = -2
