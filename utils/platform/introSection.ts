import { COLUMNS, type RowData, SAFE_HEIGHT, UNSAFE_HEIGHT } from '@/utils/tiles'

// Number of rows in the intro section
export const INTRO_SECTION_ROW_COUNT = 16
// Minimum number of safe columns in the corridor
export const INTRO_MIN_SAFE_COLS = 6

/**
 * Returns the start and end column indices for the intro corridor, given a number of safe columns.
 */
export function getIntroCorridorBounds(safeColCount: number) {
  const startCol = Math.floor((COLUMNS - safeColCount) / 2)
  const endCol = startCol + safeColCount - 1
  return { startCol, endCol }
}

/**
 * Generates row data for the intro section, with safe columns fanning in and out.
 * Returns a new array of RowData objects (does not mutate any input).
 */
export function generateIntroSectionRowData(): RowData[] {
  const rows: RowData[] = []
  const maxSafeCols = COLUMNS
  const minSafeCols = INTRO_MIN_SAFE_COLS
  const midRow = Math.floor(INTRO_SECTION_ROW_COUNT / 2)

  for (let rowIndex = 0; rowIndex < INTRO_SECTION_ROW_COUNT; rowIndex++) {
    // Calculate number of safe columns for this row (fan in/out)
    let safeColCount: number
    if (rowIndex <= midRow) {
      safeColCount = maxSafeCols - ((maxSafeCols - minSafeCols) * rowIndex) / midRow
    } else {
      safeColCount =
        minSafeCols +
        ((maxSafeCols - minSafeCols) * (rowIndex - midRow)) /
          (INTRO_SECTION_ROW_COUNT - midRow - 1)
    }
    safeColCount = Math.round(safeColCount)
    const { startCol, endCol } = getIntroCorridorBounds(safeColCount)

    // Create heights array (immutable)
    const heights = Array.from({ length: COLUMNS }, (_, colIdx) =>
      colIdx >= startCol && colIdx <= endCol ? SAFE_HEIGHT : UNSAFE_HEIGHT,
    )

    rows.push({
      heights,
      type: 'intro',
      isSectionStart: rowIndex === 0,
      isSectionEnd: rowIndex === INTRO_SECTION_ROW_COUNT - 1,
    })
  }
  return rows
}
