import { type Vector3Tuple } from 'three'

import type { ColourTileOption } from '@/components/colourPicker/ColourPicker'
import { PALETTE_COUNT } from '@/components/palette'
import { type ColourTileUserData } from '@/model/schema'
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

const LOGO_CENTER_ROW = 5
const LOGO_TRIGGER_ROW = LOGO_CENTER_ROW
const LOGO_RELATIVE_Z = 0

const COLOUR_PICKER_CENTER_ROW = 1.5
const COLOUR_PICKER_TRIGGER_ROW = Math.floor(COLOUR_PICKER_CENTER_ROW)
const COLOUR_PICKER_RELATIVE_Z =
  (COLOUR_PICKER_TRIGGER_ROW - COLOUR_PICKER_CENTER_ROW) * TILE_SIZE

// Answer tiles positions
const HOME_ANSWER_TILE_COLS = 6
export const HOME_ANSWER_TILE_ROWS = 3
export const HOME_ANSWER_TILE_WIDTH = HOME_ANSWER_TILE_COLS * TILE_SIZE
export const HOME_ANSWER_TILE_HEIGHT = HOME_ANSWER_TILE_ROWS * TILE_SIZE

const ANSWER_TILE_START_COL = Math.floor((COLUMNS - HOME_ANSWER_TILE_COLS) / 2)
const ANSWER_TILE_END_COL = ANSWER_TILE_START_COL + HOME_ANSWER_TILE_COLS - 1
const ANSWER_TILE_START_ROW = 10
const ANSWER_TILE_END_ROW = ANSWER_TILE_START_ROW + HOME_ANSWER_TILE_ROWS - 1
const ANSWER_TILE_CENTER_ROW = ANSWER_TILE_START_ROW + (HOME_ANSWER_TILE_ROWS - 1) / 2
const ANSWER_TILE_CENTER_COL = ANSWER_TILE_START_COL + (HOME_ANSWER_TILE_COLS - 1) / 2
// Trigger row fires when the leading edge of the row reaches the player, so we place answer
// bodies on the row whose animation window contains the tile centre.
const ANSWER_TILE_TRIGGER_ROW = Math.ceil(ANSWER_TILE_CENTER_ROW)
const ANSWER_TILE_RELATIVE_Z = (ANSWER_TILE_TRIGGER_ROW - ANSWER_TILE_CENTER_ROW) * TILE_SIZE

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

export function generateHomeSectionRowData(): RowData[] {
  const rows: RowData[] = new Array(HOME_SECTION_ROWS)

  for (let rowIndex = 0; rowIndex < HOME_SECTION_ROWS; rowIndex++) {
    const heights = new Array<number>(COLUMNS).fill(SAFE_HEIGHT)
    const ownership = new Array<number>(COLUMNS).fill(0)

    // Match the question section by carving out only the columns owned by each answer tile.
    const isAnswerRow = rowIndex >= ANSWER_TILE_START_ROW && rowIndex <= ANSWER_TILE_END_ROW
    if (isAnswerRow) {
      for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex++) {
        const inStartTile =
          columnIndex >= ANSWER_TILE_START_COL && columnIndex <= ANSWER_TILE_END_COL

        if (inStartTile) {
          ownership[columnIndex] = 1
        } else {
          heights[columnIndex] = UNSAFE_HEIGHT
        }
      }
    }

    rows[rowIndex] = {
      heights,
      type: 'home',
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === HOME_SECTION_ROWS - 1,
      answerNumber: ownership,
    }

    if (rowIndex === ANSWER_TILE_TRIGGER_ROW) {
      // Offset Z so the dynamic bodies land on the visual tile centres instead of the row edge.
      rows[rowIndex].answerTilePositions = [
        [colToX(ANSWER_TILE_CENTER_COL), ON_TILE_Y, ANSWER_TILE_RELATIVE_Z],
      ]
    }

    if (rowIndex === LOGO_TRIGGER_ROW) {
      rows[rowIndex].logoPosition = [colToX(COLUMNS / 2 - 0.5), ON_TILE_Y, LOGO_RELATIVE_Z]
    }

    if (rowIndex === COLOUR_PICKER_TRIGGER_ROW) {
      rows[rowIndex].colourPickerPosition = [0, ON_TILE_Y, COLOUR_PICKER_RELATIVE_Z]
    }

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

const horizontalCenterOffset = (PALETTE_COUNT - 1) / 2

export const COLOUR_TILE_OPTIONS: ColourTileOption[] = Array.from(
  { length: PALETTE_COUNT },
  (_, index) => {
    const xOffset = (index - horizontalCenterOffset) * (COLOUR_TILE_SIZE + COLOUR_TILE_GAP)
    const position: Vector3Tuple = [xOffset, ON_TILE_Y, 0]
    const userData: ColourTileUserData = {
      type: 'colour',
      paletteIndex: index,
    }
    return {
      index,
      position,
      relativeZ: 0,
      userData,
    }
  },
)
