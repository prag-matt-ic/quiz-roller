import { generateObstacleHeights } from '@/utils/platform/obstaclesSection'
import { OBSTACLE_SECTION_ROWS } from '@/utils/platform/questionSection'
import { type RowData } from '@/utils/tiles'

const INTRO_OBSTACLE_SECTION_ROWS = Math.floor(OBSTACLE_SECTION_ROWS / 2)

const INTRO_OBSTACLE_CONFIG = {
  minWidth: 4,
  maxWidth: 8,
  movePerRow: 1,
  freq: 0.12,
  notchChance: 0.1,
} as const

export function generateIntroSectionRowData(): RowData[] {
  const heights = generateObstacleHeights({
    rows: INTRO_OBSTACLE_SECTION_ROWS,
    seed: Math.floor(Math.random() * 1_000_000),
    ...INTRO_OBSTACLE_CONFIG,
  })

  return heights.map((columnHeights, rowIndex) => ({
    heights: columnHeights,
    type: 'obstacles',
    isSectionStart: rowIndex === 0,
    isSectionEnd: rowIndex === INTRO_OBSTACLE_SECTION_ROWS - 1,
  }))
}
