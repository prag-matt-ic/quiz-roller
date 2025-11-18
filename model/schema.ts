export type PlayerUserData = {
  type: 'player'
}

export type OutOfBoundsUserData = {
  type: 'out-of-bounds'
}

export type ColourTileUserData = {
  type: 'colour'
  paletteIndex: 0 | 1 | 2
}

export enum Collectible {
  Coin = 'coin',
  Gem = 'gem',
  Bar = 'bar',
}

export type CollectibleUserData = {
  type: 'collectible'
  collectible: Collectible
  index: number
}

export type InfoZoneUserData = {
  type: 'info-zone'
}

export type RigidBodyUserData =
  | PlayerUserData
  | OutOfBoundsUserData
  | ColourTileUserData
  | CollectibleUserData
  | InfoZoneUserData
