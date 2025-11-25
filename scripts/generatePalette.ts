#!/usr/bin/env ts-node

import { pathToFileURL } from 'node:url'

import {
  DEFAULT_PARTICLE_PALETTE_CONFIG,
  generateParticlePaletteList,
} from '../components/dev/colourTexture/particlePalette/generator'

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
    const palette = generateParticlePaletteList(args, DEFAULT_PARTICLE_PALETTE_CONFIG)
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
