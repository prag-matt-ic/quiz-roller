import { createNoise2D } from 'simplex-noise'

import { clamp, COLUMNS, lerp, SAFE_HEIGHT, UNSAFE_HEIGHT } from '@/utils/tiles'

type ObstacleParams = {
  rows: number // e.g. 256
  seed?: number // deterministic if you want; defaults Math.random()
  minWidth: number // minimum open corridor width (>=1)
  maxWidth: number // starting width (e.g. 4)
  movePerRow: number // max lateral shift (cells) per row (reachability)
  freq: number // noise frequency (0.05..0.2)
  notchChance: number // 0..1 small chance to nibble corridor edge
}

function stepToward(curr: number, target: number, maxStep: number) {
  if (target > curr) return Math.min(curr + maxStep, target)
  if (target < curr) return Math.max(curr - maxStep, target)
  return curr
}

/**
 * Generate a batch of obstacle rows that ALWAYS contains a continuous safe corridor.
 * Returns heights[row][col] where blocked -> blockedHeight, open -> openHeight.
 *
 * TODO: Move this generator into its own module (e.g. model/obstacles.ts) and
 * expose a pure function for testability.
 */
export function generateObstacleHeights(params: ObstacleParams): number[][] {
  const {
    rows,
    seed = Math.random(),
    minWidth,
    maxWidth,
    movePerRow,
    freq,
    notchChance,
  } = params

  // Hard-coded taper band lengths for easing in/out of the obstacle corridor
  const TAPER_IN_ROWS = 8
  const TAPER_OUT_ROWS = 8

  // Use simplex 2D as 1D noise by fixing Y=seed
  const noise2D = createNoise2D()
  const noise1D = (i: number) => noise2D(i * freq, seed) // [-1, 1]

  const heights: number[][] = new Array(rows)

  // width "breathes" and gently shrinks across the batch
  const widthAt = (i: number) => {
    const t = i / rows
    const wiggle = noise1D(i * 0.25 + 100) * 0.5 + 0.5 // [0,1]
    const base = lerp(maxWidth, minWidth, t) // shrink over batch
    const knock = wiggle > 0.7 ? 1 : 0
    return clamp(Math.round(base - knock), minWidth, maxWidth)
  }

  const centerStart = Math.floor(COLUMNS / 2)
  let cPrev = centerStart
  // Pre-compute band and clamp taper sizes (no explicit padding rows)
  const innerStart = 0
  const innerEnd = rows - 1 // inclusive
  const innerCount = Math.max(0, rows)
  // Ensure taper bands never overlap even on very small batches
  const tIn = clamp(Math.floor(TAPER_IN_ROWS), 0, Math.floor(innerCount / 2))
  const tOut = clamp(Math.floor(TAPER_OUT_ROWS), 0, Math.floor(innerCount / 2))
  const taperOutStart = innerEnd - tOut + 1 // first row index of taper-out band

  // Generate obstacle rows across the full section (taper handles easing)
  for (let i = innerStart; i <= innerEnd; i++) {
    const rowHeights = new Array<number>(COLUMNS).fill(UNSAFE_HEIGHT)

    // Soft target center from noise, then cap drift for reachability
    const n = noise1D(i) // [-1,1]
    const target = Math.round((n + 1) * 0.5 * (COLUMNS - 3)) + 1 // keep off hard edges
    const c = clamp(stepToward(cPrev, target, movePerRow), 0, COLUMNS - 1)
    const wBase = widthAt(i)

    // Compute effective width with tapering near the ends
    let wEff = wBase
    const inTaperIn = tIn > 0 && i < innerStart + tIn
    const inTaperOut = tOut > 0 && i >= taperOutStart
    if (inTaperIn) {
      // Ease from fully open (COLUMNS) down to the base width
      const t = (i - innerStart + 1) / (tIn + 1)
      wEff = Math.round(lerp(COLUMNS, wBase, t))
    } else if (inTaperOut) {
      // Ease from base width back up to fully open
      const t = (i - taperOutStart + 1) / (tOut + 1)
      wEff = Math.round(lerp(wBase, COLUMNS, t))
    }

    // Keep effective width within sensible bounds
    wEff = clamp(wEff, Math.max(1, minWidth), COLUMNS)

    // Corridor indices
    const halfL = Math.floor((wEff - 1) / 2)
    const halfR = Math.ceil((wEff - 1) / 2)
    const L = clamp(c - halfL, 0, COLUMNS - 1)
    const R = clamp(c + halfR, 0, COLUMNS - 1)

    // Open the corridor
    for (let col = L; col <= R; col++) rowHeights[col] = SAFE_HEIGHT

    // Optional notch: nibble corridor edge but never seal it
    // Skip notches during taper rows to keep the transition clean
    if (!inTaperIn && !inTaperOut && Math.random() < notchChance && wEff >= 2) {
      const sideLeft = Math.random() < 0.5
      const notchWidth = Math.min(2, wEff - 1) // preserve ≥1 open cell
      if (sideLeft) {
        for (let k = 0; k < notchWidth; k++) rowHeights[L + k] = UNSAFE_HEIGHT
      } else {
        for (let k = 0; k < notchWidth; k++) rowHeights[R - k] = UNSAFE_HEIGHT
      }
      // Ensure at least one cell open
      let anyOpen = false
      for (let col = L; col <= R; col++)
        if (rowHeights[col] === SAFE_HEIGHT) {
          anyOpen = true
          break
        }
      if (!anyOpen) rowHeights[c] = SAFE_HEIGHT // reopen center if we accidentally sealed it
    }

    heights[i] = rowHeights
    cPrev = c
  }

  return heights
}
