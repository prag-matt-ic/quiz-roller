#!/usr/bin/env ts-node

import { colorsFromRange, rgb, css } from '@thi.ng/color'
import { pathToFileURL } from 'node:url'

// Instructions
// This generates a palette of colours based on input hex colors.
// npx tsx scripts/generatePalette.ts #hex #hex ...

type RangeConfig = {
  num: number
  variance: number
}

type PaletteConfig = {
  bright: RangeConfig
  cool: RangeConfig
  neutral: RangeConfig
}

const DEFAULT_PALETTE_CONFIG: PaletteConfig = {
  bright: { num: 7, variance: 0.08 },
  cool: { num: 2, variance: 0.05 },
  neutral: { num: 1, variance: 0.02 },
}

const HEX_COLOR_PATTERN = /^#?([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i

function normalizeHexColor(input: string): string {
  const trimmed = input.trim()

  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    throw new Error(`Invalid hex color: ${input}`)
  }

  const hex = trimmed.startsWith('#') ? trimmed.slice(1) : trimmed
  return `#${hex.toLowerCase()}`
}

function generatePaletteForColor(color: string, config: PaletteConfig): string[] {
  const base = rgb(color)
  const segments = [
    ...Array.from(
      colorsFromRange('bright', {
        base,
        num: config.bright.num,
        variance: config.bright.variance,
      }),
    ),
    ...Array.from(
      colorsFromRange('cool', { base, num: config.cool.num, variance: config.cool.variance }),
    ),
    ...Array.from(
      colorsFromRange('neutral', {
        base,
        num: config.neutral.num,
        variance: config.neutral.variance,
      }),
    ),
  ]

  return segments.map((value) => css(value))
}

/**
 * Generates a dynamic color palette from an array of hex color values using @thi.ng/color.
 */
export function generateDynamicPalette(
  inputColors: string[],
  config: PaletteConfig = DEFAULT_PALETTE_CONFIG,
): string[] {
  if (inputColors.length === 0) {
    throw new Error('At least one input color is required to generate a palette')
  }

  const normalizedColors = inputColors.map(normalizeHexColor)
  const generatedColors = normalizedColors.flatMap((color) =>
    generatePaletteForColor(color, config),
  )
  const palette = [...normalizedColors, ...generatedColors]
  return Array.from(new Set(palette))
}

function formatPaletteForConsole(palette: string[]): string {
  return palette.map((color) => `  '${color}',`).join('\n')
}

function showUsage(): void {
  console.log(`Usage:
  npx tsx scripts/generatePalette.ts <hex-color> [<hex-color> ...]
  # Alternatively (ts-node with ESM loader)
  node --loader ts-node/esm scripts/generatePalette.ts <hex-color> [<hex-color> ...]
Example:
  npx tsx scripts/generatePalette.ts #00fcdf #00f0d0 #00ffff`)
}

async function runFromCli(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.some((arg) => arg === '--help' || arg === '-h')) {
    showUsage()
    process.exit(0)
  }

  if (args.length === 0) {
    showUsage()
    process.exit(1)
  }

  const flaggedArgs = args.filter((arg) => arg.startsWith('-'))
  if (flaggedArgs.length > 0) {
    console.error(`Unknown flag(s): ${flaggedArgs.join(', ')}`)
    showUsage()
    process.exit(1)
  }

  try {
    const palette = generateDynamicPalette(args)
    console.log('======== Palette ========')
    console.log(formatPaletteForConsole(palette))
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

const executedDirectly = (() => {
  try {
    const currentFile = pathToFileURL(process.argv[1] ?? '')
    return currentFile.href === import.meta.url
  } catch {
    return false
  }
})()

if (executedDirectly) {
  runFromCli().catch((error) => {
    console.error(error instanceof Error ? error.message : error)
    process.exit(1)
  })
}
