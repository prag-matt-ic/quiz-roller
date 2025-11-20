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

export type FinishLineUserData = {
  type: 'finish-line'
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

export const speedRunSubmissionSchema = z.object({
  username: z.string().min(3).max(12),
  time: z.number(),
  attempt: z.number().min(1),
  date: z.string(),
})

export const speedrunDatabaseSchema = speedRunSubmissionSchema.extend({
  id: z.number(),
  ip: z.string(),
  country: z.string().length(2).nullable(),
  flag: z.string().nullable(),
})

export type SpeedRunSubmission = z.infer<typeof speedRunSubmissionSchema>

export type SpeedRunDatabaseInsert = Omit<SpeedRunDatabase, 'id'>

export type SpeedRunDatabase = z.infer<typeof speedrunDatabaseSchema>
