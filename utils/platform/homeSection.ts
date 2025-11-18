import {
  colToX,
  COLUMNS,
  createEmptyRingPositions,
  ON_TILE_Y,
  type RowData,
  SAFE_HEIGHT,
  TILE_SIZE,
} from '@/utils/tiles'
import { roughenEdges } from './roughenEdges'
import { HEADING_Y } from './floatingHeading'

const HOME_SECTION_ROWS = 16

const IMAGE_CENTER_ROW = 5
const IMAGE_TRIGGER_ROW = IMAGE_CENTER_ROW
const IMAGE_RELATIVE_Z = 0

const HOME_ARROW_LINE_ROWS = 7
const HOME_ARROW_HEAD_HALF_WIDTH = 2
const HOME_ARROW_TRIANGLE_ROWS = HOME_ARROW_HEAD_HALF_WIDTH + 1
const HOME_ARROW_LINE_START_ROW = 5
const HOME_ARROW_CENTER_COLUMN = Math.floor(COLUMNS / 2)

const HOME_HEADING_CENTER_ROW = 6
const HOME_HEADING_TRIGGER_ROW = Math.ceil(HOME_HEADING_CENTER_ROW)
const HOME_HEADING_RELATIVE_Z = (HOME_HEADING_TRIGGER_ROW - HOME_HEADING_CENTER_ROW) * TILE_SIZE
const HOME_HEADING_X = colToX(COLUMNS / 2 - 0.5)

const HOME_RING_LAYOUT = [
  {
    row: 2,
    columns: [
      Math.max(0, Math.floor(COLUMNS / 2) - 6),
      Math.floor(COLUMNS / 2),
      Math.min(COLUMNS - 1, Math.floor(COLUMNS / 2) + 6),
    ],
  },
  {
    row: 8,
    columns: [2, COLUMNS - 3],
  },
  {
    row: 12,
    columns: [Math.floor(COLUMNS / 2) - 10, Math.floor(COLUMNS / 2) + 10],
  },
]

export function generateHomeSectionRowData(): RowData[] {
  const rows: RowData[] = new Array(HOME_SECTION_ROWS)

  for (let rowIndex = 0; rowIndex < HOME_SECTION_ROWS; rowIndex++) {
    const heights = new Array<number>(COLUMNS).fill(SAFE_HEIGHT)

    rows[rowIndex] = {
      heights,
      type: 'home',
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === HOME_SECTION_ROWS - 1,
      isHighlighted: [],
      ringPositions: createEmptyRingPositions(),
    }

    if (rowIndex === IMAGE_TRIGGER_ROW) {
      rows[rowIndex].imagePosition = [colToX(COLUMNS / 2 - 0.5), ON_TILE_Y, IMAGE_RELATIVE_Z]
    }

    if (rowIndex === HOME_HEADING_TRIGGER_ROW) {
      rows[rowIndex].floatingHeadingPosition = [
        HOME_HEADING_X,
        HEADING_Y,
        HOME_HEADING_RELATIVE_Z,
      ]
    }
  }

  applyBitmapArrowHighlight(rows)
  applyHomeRingLayout(rows)

  roughenEdges({
    rows,
    seed: 1337,
    protectRanges: [
      {
        startCol: Math.max(0, HOME_ARROW_CENTER_COLUMN - HOME_ARROW_HEAD_HALF_WIDTH),
        endColExclusive: Math.min(
          COLUMNS,
          HOME_ARROW_CENTER_COLUMN + HOME_ARROW_HEAD_HALF_WIDTH + 1,
        ),
      },
    ],
    rowWindow: {
      start: 1,
      endExclusive: HOME_SECTION_ROWS - 1,
    },
    maxIndentColumns: 3,
  })

  return rows
}

function applyBitmapArrowHighlight(rows: RowData[]) {
  const startRow = clampRowIndex(rows, HOME_ARROW_LINE_START_ROW)
  const endRowExclusive = Math.min(rows.length, startRow + HOME_ARROW_LINE_ROWS)
  const headRow = endRowExclusive - 1

  for (let rowIndex = startRow; rowIndex < endRowExclusive; rowIndex++) {
    const highlight = fillHighlightArray(rows[rowIndex])
    highlight[HOME_ARROW_CENTER_COLUMN] = 1
  }

  for (let offset = 0; offset < HOME_ARROW_TRIANGLE_ROWS; offset++) {
    const rowIndex = headRow - offset
    if (rowIndex < startRow || rowIndex < 0) break

    const highlight = fillHighlightArray(rows[rowIndex])
    const radius = Math.min(offset, HOME_ARROW_HEAD_HALF_WIDTH)
    if (radius === 0) continue

    const leftColumn = HOME_ARROW_CENTER_COLUMN - radius
    const rightColumn = HOME_ARROW_CENTER_COLUMN + radius

    if (leftColumn >= 0) highlight[leftColumn] = 1
    if (rightColumn < COLUMNS) highlight[rightColumn] = 1
  }
}

function applyHomeRingLayout(rows: RowData[]) {
  HOME_RING_LAYOUT.forEach(({ row, columns }) => {
    if (row < 0 || row >= rows.length) return
    const targetRow = rows[row]
    if (!targetRow) return
    if (!targetRow.ringPositions || targetRow.ringPositions.length !== COLUMNS) {
      targetRow.ringPositions = createEmptyRingPositions()
    }

    columns.forEach((columnIndex) => {
      if (columnIndex < 0 || columnIndex >= COLUMNS) return
      targetRow.ringPositions![columnIndex] = 1
    })
  })
}

function fillHighlightArray(row: RowData): number[] {
  if (!row.isHighlighted || row.isHighlighted.length !== COLUMNS) {
    row.isHighlighted = new Array(COLUMNS).fill(0)
  }
  return row.isHighlighted
}

function clampRowIndex(rows: RowData[], requestedIndex: number): number {
  if (rows.length === 0) return 0
  if (requestedIndex < 0) return 0
  if (requestedIndex >= rows.length) return rows.length - 1
  return requestedIndex
}
