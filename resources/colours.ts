import { CollectibleID } from '../model/schema'

export const INFO_ZONE_SPHERE_COLOURS: readonly string[] = [
  '#37D6C7',
  '#00EDC6',
  '#00EDC6',
  '#00FFFF',
  '#00FFD2',
]

export const GOLD_PARTICLE_PALETTE: readonly string[] = [
  '#f6b253',
  '#ffcc3e',
  '#ffb328',
  '#ffc82c',
  '#ffdd3f',
  '#ffbd1f',
  '#ffb51d',
  '#ffaf07',
  '#ffe55e',
  '#f7ebda',
  '#fff7ec',
  '#fde5d2',
]

export const BLUE_PARTICLE_PALETTE: readonly string[] = [
  '#6a68e7',
  '#e4d8ff',
  '#debcff',
  '#b8bfff',
  '#b1c0ff',
  '#d8c1ff',
  '#e7c4ff',
  '#e8ceff',
  '#eec6ff',
  '#e4e1f9',
  '#e9e3fc',
  '#fffaff',
]

export const GREEN_PARTICLE_PALETTE: readonly string[] = [
  '#5ed35e',
  '#47ec5e',
  '#97ff7c',
  '#74e45d',
  '#80f662',
  '#6ae557',
  '#5ce62c',
  '#60ea48',
  '#4eff83',
  '#eeffe9',
  '#e7fce1',
  '#e6ffdd',
]

export const GEM_COLOURS = ['#F6B253', '#6A68E7', '#5ED35E'] as const

export const GEMS_COLOURS_BY_ID: Record<
  CollectibleID,
  { colour: string; particlesPalette: readonly string[] }
> = {
  [CollectibleID.DesignTools]: {
    colour: GEM_COLOURS[0],
    particlesPalette: GOLD_PARTICLE_PALETTE,
  },
  [CollectibleID.AI_Prompts]: {
    colour: GEM_COLOURS[1],
    particlesPalette: BLUE_PARTICLE_PALETTE,
  },
  [CollectibleID.Consultation]: {
    colour: GEM_COLOURS[2],
    particlesPalette: GREEN_PARTICLE_PALETTE,
  },
} as const
