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

export enum CollectibleType {
  Discount = 'discount',
  AI_Prompts = 'ai_prompts',
  Consultation = 'consultation',
}

export const COLLECTIBLE_TYPES: CollectibleType[] = Object.values(CollectibleType)

export type CollectibleUserData = {
  type: 'collectible'
  collectibleType: CollectibleType
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
