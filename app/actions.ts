'use server'
import { neon } from '@neondatabase/serverless'
import { headers } from 'next/headers'
import { z } from 'zod'

import {
  type InsertSpeedRunResponse,
  type ServerSpeedRunSubmission,
  type SpeedRunDatabase,
  type SpeedRunDatabaseInsert,
  speedrunDatabaseInsertSchema,
  speedrunDatabaseSchema,
} from '@/model/schema'

export async function getSpeedrunData(
  count: number,
  levelId: string = '1.0',
): Promise<SpeedRunDatabase[]> {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const speedrun = await sql`
      SELECT id, username, time, date, ip, country, flag, attempt, input_type, level_id
      FROM "quizroller_speedrun" 
      WHERE level_id = ${levelId}
      ORDER BY time ASC
      LIMIT ${count}
    `
    return speedrunDatabaseSchema.array().parse(speedrun)
  } catch (error) {
    console.error('Error fetching speedrun data:', error)
    return []
  }
}

export async function getSpeedrunPosition(
  id: number,
  levelId: string = '1.0',
): Promise<{
  run: SpeedRunDatabase
  position: number
} | null> {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const result = await sql`
      WITH ranked_runs AS (
        SELECT 
          id,
          username,
          time,
          date,
          ip,
          country,
          flag,
          attempt,
          input_type,
          level_id,
          ROW_NUMBER() OVER (ORDER BY time ASC) as position
        FROM "quizroller_speedrun"
        WHERE level_id = ${levelId}
      )
      SELECT id, username, time, date, ip, country, flag, attempt, position, input_type, level_id
      FROM ranked_runs
      WHERE id = ${id}
    `

    if (!result || result.length === 0) return null
    const run = speedrunDatabaseSchema.parse(result[0])
    const position = result[0].position as number
    return { run, position }
  } catch (error) {
    console.error('Error fetching player position:', error)
    return null
  }
}

const LEVEL_ID = '1.0'

export async function insertSpeedRun({
  username,
  date,
  time,
  input_type,
  level_id = LEVEL_ID,
}: ServerSpeedRunSubmission): InsertSpeedRunResponse {
  try {
    const headersList = await headers()

    // TODO: This doesnt work on windows
    const getFlagEmoji = (countryCode: string) => {
      const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map((char) => 127397 + char.charCodeAt(0))
      return String.fromCodePoint(...codePoints)
    }

    const ip = headersList.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1'
    const country = headersList.get('x-vercel-ip-country') ?? 'GB'
    const flag = !!country ? getFlagEmoji(country) : null

    const sql = neon(process.env.DATABASE_URL!)

    // Calculate attempt number based on username AND IP
    const previousAttempts = await sql`
      SELECT COUNT(*) as count
      FROM "quizroller_speedrun"
      WHERE username = ${username}
      AND ip = ${ip}
    `

    console.warn('Previous attempts for', { username, ip, previousAttempts })
    const attempt = (Number(previousAttempts[0]?.count) || 0) + 1

    const insert: SpeedRunDatabaseInsert = {
      username,
      time,
      date,
      ip,
      country: country ?? null,
      attempt,
      flag: flag ?? null,
      input_type,
      level_id,
    }

    const validatedInsert = speedrunDatabaseInsertSchema.parse(insert)

    // TODO: Rename this table.
    const insertResult = await sql`
      INSERT INTO "quizroller_speedrun" (username, time, date, ip, country, flag, attempt, input_type, level_id) 
      VALUES (${validatedInsert.username}, ${validatedInsert.time}, ${validatedInsert.date}, ${validatedInsert.ip}, ${validatedInsert.country}, ${validatedInsert.flag}, ${validatedInsert.attempt}, ${validatedInsert.input_type}, ${validatedInsert.level_id})
      RETURNING id, username, time, date, ip, country, flag, attempt, input_type, level_id
    `
    if (!insertResult || insertResult.length === 0)
      throw new Error('No data returned from insert')

    const parsedInsert = speedrunDatabaseSchema.parse(insertResult[0])
    console.warn('Inserted speedrun:', parsedInsert)

    return parsedInsert
  } catch (error) {
    console.error('Error submitting speedrun:', error)

    // TODO: handle returning an error and showing it in the UI with a toast or similar

    if (error instanceof z.ZodError) return null
    return null
  }
}

export async function deleteAllSpeedRuns(): Promise<number> {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    const deletedRows = await sql`
      DELETE FROM "quizroller_speedrun"
      RETURNING id
    `
    console.warn('Deleted speedrun rows:', deletedRows.length)
    return deletedRows.length
  } catch (error) {
    console.error('Error resetting speedruns:', error)
    return 0
  }
}
