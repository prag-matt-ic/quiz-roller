import { createNoise2D } from 'simplex-noise'

import { COLUMNS, RowData, UNSAFE_HEIGHT } from '@/utils/tiles'

export type ProtectRange = {
  startCol: number
  endColExclusive: number
}

export type RoughenEdgesOptions = {
  rows: RowData[]
  maxIndentColumns?: number
  maxDeltaPerRow?: number
  frequency?: number
  seed?: number
  unsafeHeight?: number
  protectRanges?: ProtectRange[]
  rowWindow?: {
    start?: number
    endExclusive?: number
  }
}

const DEFAULT_MAX_INDENT = 3
const DEFAULT_MAX_DELTA = 1
const DEFAULT_FREQUENCY = 0.12
const LEFT_NOISE_OFFSET = 0
const RIGHT_NOISE_OFFSET = 100

const noise2D = createNoise2D()

export function roughenEdges(options: RoughenEdgesOptions): void {
  const {
    rows,
    maxIndentColumns = DEFAULT_MAX_INDENT,
    maxDeltaPerRow = DEFAULT_MAX_DELTA,
    frequency = DEFAULT_FREQUENCY,
    seed = Math.random() * 1000,
    unsafeHeight = UNSAFE_HEIGHT,
    protectRanges = [],
    rowWindow,
  } = options

  if (!rows.length || maxIndentColumns <= 0) return

  const startRow = clampRowIndex(rowWindow?.start ?? 0, rows.length)
  const endRowExclusive = clampRowIndex(rowWindow?.endExclusive ?? rows.length, rows.length)

  if (startRow >= endRowExclusive) return

  let prevLeftIndent = 0
  let prevRightIndent = 0

  for (let rowIndex = startRow; rowIndex < endRowExclusive; rowIndex++) {
    const row = rows[rowIndex]
    const heights = row.heights
    if (!heights || heights.length !== COLUMNS) continue

    const leftTarget = sampleIndent({
      rowIndex,
      seed,
      frequency,
      maxIndentColumns,
      offset: LEFT_NOISE_OFFSET,
    })
    const rightTarget = sampleIndent({
      rowIndex,
      seed,
      frequency,
      maxIndentColumns,
      offset: RIGHT_NOISE_OFFSET,
    })

    const leftIndent = stepToward({ current: prevLeftIndent, target: leftTarget, maxStep: maxDeltaPerRow })
    const rightIndent = stepToward({
      current: prevRightIndent,
      target: rightTarget,
      maxStep: maxDeltaPerRow,
    })

    const appliedLeft = carveSide({
      row,
      indent: leftIndent,
      fromLeft: true,
      unsafeHeight,
      protectRanges,
    })

    const appliedRight = carveSide({
      row,
      indent: rightIndent,
      fromLeft: false,
      unsafeHeight,
      protectRanges,
    })

    prevLeftIndent = appliedLeft
    prevRightIndent = appliedRight
  }
}

type SampleIndentParams = {
  rowIndex: number
  seed: number
  frequency: number
  maxIndentColumns: number
  offset: number
}

function sampleIndent({ rowIndex, seed, frequency, maxIndentColumns, offset }: SampleIndentParams): number {
  const noiseValue = noise2D(rowIndex * frequency, seed + offset) // [-1, 1]
  const normalized = (noiseValue + 1) * 0.5 // [0, 1]
  return Math.round(normalized * maxIndentColumns)
}

type CarveSideParams = {
  row: RowData
  indent: number
  fromLeft: boolean
  unsafeHeight: number
  protectRanges: ProtectRange[]
}

function carveSide({
  row,
  indent,
  fromLeft,
  unsafeHeight,
  protectRanges,
}: CarveSideParams): number {
  if (indent <= 0) return 0

  const heights = row.heights
  const highlight = row.isHighlighted
  const direction = fromLeft ? 1 : -1
  let columnIndex = fromLeft ? 0 : COLUMNS - 1
  let carved = 0

  while (carved < indent && columnIndex >= 0 && columnIndex < COLUMNS) {
    if (isProtected(columnIndex, protectRanges)) break

    heights[columnIndex] = unsafeHeight
    if (highlight && highlight.length === COLUMNS) {
      highlight[columnIndex] = 0
    }

    carved += 1
    columnIndex += direction
  }

  return carved
}

function isProtected(columnIndex: number, protectRanges: ProtectRange[]): boolean {
  for (let i = 0; i < protectRanges.length; i++) {
    const range = protectRanges[i]
    if (columnIndex >= range.startCol && columnIndex < range.endColExclusive) {
      return true
    }
  }
  return false
}

function clampRowIndex(index: number, length: number): number {
  if (Number.isNaN(index)) return 0
  return Math.max(0, Math.min(length, Math.floor(index)))
}

type StepTowardParams = {
  current: number
  target: number
  maxStep: number
}

function stepToward({ current, target, maxStep }: StepTowardParams): number {
  if (target > current) return Math.min(current + maxStep, target)
  if (target < current) return Math.max(current - maxStep, target)
  return current
}
