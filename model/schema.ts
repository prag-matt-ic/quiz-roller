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

export enum CollectibleID {
  Discount = 'discount',
  AI_Prompts = 'ai_prompts',
  Consultation = 'consultation',
}

export const COLLECTIBLE_IDS: CollectibleID[] = Object.values(CollectibleID)

export type CollectibleUserData = {
  type: 'collectible'
  collectibleType: CollectibleID
}

export type ConfettiUserData = {
  type: 'confetti'
  confettiIndex: number
}

export type InfoZoneUserData = {
  type: 'info-zone'
}

export type CtaZoneUserData = {
  type: 'cta-zone'
}

export type FinishLineUserData = {
  type: 'finish-line'
}

export type RigidBodyUserData =
  | PlayerUserData
  | OutOfBoundsUserData
  | CollectibleUserData
  | ConfettiUserData
  | InfoZoneUserData
  | CtaZoneUserData

const isoDateStringSchema = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Invalid date string')

const databaseDateSchema = isoDateStringSchema.or(
  z.date().transform((date) => date.toISOString()),
)

export const speedRunSubmissionSchema = z.object({
  username: z.string().min(3).max(12),
  time: z.number(),
  attempt: z.number().min(1),
  date: isoDateStringSchema,
})

export const speedrunDatabaseInsertSchema = speedRunSubmissionSchema.extend({
  ip: z.string(),
  country: z.string().length(2).nullable(),
  flag: z.string().nullable(),
})

export const speedrunDatabaseSchema = speedrunDatabaseInsertSchema.extend({
  id: z.number(),
  date: databaseDateSchema,
})

export type SpeedRunSubmission = z.infer<typeof speedRunSubmissionSchema>

export type ServerSpeedRunSubmission = Omit<SpeedRunSubmission, 'attempt'>

export type SpeedRunDatabaseInsert = z.infer<typeof speedrunDatabaseInsertSchema>

export type SpeedRunDatabase = z.infer<typeof speedrunDatabaseSchema>

export type InsertSpeedRunResponse = Promise<SpeedRunDatabase | null>
