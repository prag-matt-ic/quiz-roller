import { z } from 'zod'

export type PlayerUserData = {
  type: 'player'
}

export type OutOfBoundsUserData = {
  type: 'out-of-bounds'
}

export type RingUserData = {
  type: 'ring'
  slotIndex: number
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

export type CtaZoneUserData = {
  type: 'cta-zone'
}

export type RigidBodyUserData =
  | PlayerUserData
  | OutOfBoundsUserData
  | CollectibleUserData
  | InfoZoneUserData
  | CtaZoneUserData

export const speedrunSchema = z.object({
  name: z.string().min(3),
  time: z.number(),
  date: z.string(),
  ip: z.string(),
  country: z.string().length(2).nullable(),
})