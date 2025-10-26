import { type Vector3Tuple } from 'three'

import type { ColourTileOption } from '@/components/colourPicker/ColourPicker'
import { COLOUR_RANGES } from '@/components/palette'
import { type MarbleColourUserData } from '@/model/schema'
import {
  ANSWER_TILE_COLS,
  ANSWER_TILE_ROWS,
  colToX,
  COLUMNS,
  ON_TILE_Y,
  type RowData,
  SAFE_HEIGHT,
  TILE_SIZE,
  UNSAFE_HEIGHT,
} from '@/utils/tiles'

const HOME_SECTION_ROWS = 20

const LOGO_CENTER_ROW = 7
const LOGO_TRIGGER_ROW = LOGO_CENTER_ROW
const LOGO_RELATIVE_Z = 0

const COLOUR_PICKER_CENTER_ROW = 1.5
const COLOUR_PICKER_TRIGGER_ROW = Math.floor(COLOUR_PICKER_CENTER_ROW)
const COLOUR_PICKER_RELATIVE_Z =
  (COLOUR_PICKER_TRIGGER_ROW - COLOUR_PICKER_CENTER_ROW) * TILE_SIZE

// Text position
const TEXT_ROWS = 2

export const TEXT_WIDTH = 12 * TILE_SIZE
export const TEXT_HEIGHT = TEXT_ROWS * TILE_SIZE

const TEXT_CENTER_ROW = 9
const TEXT_TRIGGER_ROW = Math.ceil(TEXT_CENTER_ROW + TEXT_ROWS / 2)
// Align trigger to the row whose visible edge contains the top of the text block.
const TEXT_Z_RELATIVE = (TEXT_TRIGGER_ROW - TEXT_CENTER_ROW) * TILE_SIZE

// Answer tiles positions
const ANSWER_LEFT_TILE_START_COL = 1
const ANSWER_RIGHT_TILE_START_COL = 9
const ANSWER_TILE_START_ROW = 11
const ANSWER_TILE_END_ROW = ANSWER_TILE_START_ROW + ANSWER_TILE_ROWS - 1
const ANSWER_TILE_CENTER_ROW = ANSWER_TILE_START_ROW + (ANSWER_TILE_ROWS - 1) / 2
// Trigger row fires when the leading edge of the row reaches the player, so we place answer
// bodies on the row whose animation window contains the tile centre.
const ANSWER_TILE_TRIGGER_ROW = Math.ceil(ANSWER_TILE_CENTER_ROW)
const ANSWER_TILE_RELATIVE_Z = (ANSWER_TILE_TRIGGER_ROW - ANSWER_TILE_CENTER_ROW) * TILE_SIZE

export function generateHomeSectionRowData(): RowData[] {
  const rows: RowData[] = new Array(HOME_SECTION_ROWS)
  const leftEndCol = ANSWER_LEFT_TILE_START_COL + ANSWER_TILE_COLS - 1
  const rightEndCol = ANSWER_RIGHT_TILE_START_COL + ANSWER_TILE_COLS - 1
  const leftCenterCol = ANSWER_LEFT_TILE_START_COL + (ANSWER_TILE_COLS - 1) / 2
  const rightCenterCol = ANSWER_RIGHT_TILE_START_COL + (ANSWER_TILE_COLS - 1) / 2

  for (let rowIndex = 0; rowIndex < HOME_SECTION_ROWS; rowIndex++) {
    const heights = new Array<number>(COLUMNS).fill(SAFE_HEIGHT)
    const ownership = new Array<number>(COLUMNS).fill(0)

    // Match the question section by carving out only the columns owned by each answer tile.
    const isAnswerRow = rowIndex >= ANSWER_TILE_START_ROW && rowIndex <= ANSWER_TILE_END_ROW
    if (isAnswerRow) {
      for (let columnIndex = 0; columnIndex < COLUMNS; columnIndex++) {
        const inLeftTile =
          columnIndex >= ANSWER_LEFT_TILE_START_COL && columnIndex <= leftEndCol

        if (inLeftTile) {
          ownership[columnIndex] = 1
          continue
        }

        const inRightTile =
          columnIndex >= ANSWER_RIGHT_TILE_START_COL && columnIndex <= rightEndCol

        if (inRightTile) {
          ownership[columnIndex] = 2
          continue
        }
        heights[columnIndex] = UNSAFE_HEIGHT
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
        [colToX(leftCenterCol), ON_TILE_Y, ANSWER_TILE_RELATIVE_Z],
        [colToX(rightCenterCol), ON_TILE_Y, ANSWER_TILE_RELATIVE_Z],
      ]
    }

    if (rowIndex === TEXT_TRIGGER_ROW) {
      rows[rowIndex].topicTextPosition = [colToX(COLUMNS / 2 - 0.5), ON_TILE_Y, TEXT_Z_RELATIVE]
    }

    if (rowIndex === LOGO_TRIGGER_ROW) {
      rows[rowIndex].logoPosition = [colToX(COLUMNS / 2 - 0.5), ON_TILE_Y, LOGO_RELATIVE_Z]
    }

    if (rowIndex === COLOUR_PICKER_TRIGGER_ROW) {
      rows[rowIndex].colourPickerPosition = [0, 0, COLOUR_PICKER_RELATIVE_Z]
    }
  }

  return rows
}

// Colour picker config
export const COLOUR_TILE_SIZE = TILE_SIZE * 2
export const COLOUR_TILE_GAP = TILE_SIZE
export const COLOUR_TILE_TEXT_RELATIVE_Z = -2

const horizontalCenterOffset = (COLOUR_RANGES.length - 1) / 2

export const COLOUR_TILE_OPTIONS: ColourTileOption[] = COLOUR_RANGES.map((_, index) => {
  const xOffset = (index - horizontalCenterOffset) * (COLOUR_TILE_SIZE + COLOUR_TILE_GAP)
  const position: Vector3Tuple = [xOffset, ON_TILE_Y, COLOUR_TILE_TEXT_RELATIVE_Z]
  const userData: MarbleColourUserData = {
    type: 'marble-colour',
    colourIndex: index,
  }
  return {
    index,
    position,
    relativeZ: 0,
    userData,
  }
})
