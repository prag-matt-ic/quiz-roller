'use server'
import { z } from 'zod'
import { headers } from 'next/headers'
import {
  type SpeedRunDatabase,
  type SpeedRunDatabaseInsert,
  speedrunDatabaseInsertSchema,
  speedrunDatabaseSchema,
  type SpeedRunSubmission,
  type InsertSpeedRunResponse,
} from '@/model/schema'
import { neon } from '@neondatabase/serverless'

export async function getSpeedrunData(count: number): Promise<SpeedRunDatabase[]> {
  try {
    const sql = neon(process.env.DATABASE_URL!)
    // TODO: Theo: add an index to the table on time for performance - ask AI best type of index for this data.
    const speedruns = await sql`
      SELECT id, username, time, date, ip, country, flag, attempt
      FROM "quizroller_speedrun" 
      ORDER BY time ASC
      LIMIT ${count}
    `
    return speedrunDatabaseSchema.array().parse(speedruns)
  } catch (error) {
    console.error('Error fetching speedruns:', error)
    return []
  }
}

// get speed run position by id....

export async function insertSpeedRun({
  username,
  date,
  time,
  attempt = 1,
}: SpeedRunSubmission): InsertSpeedRunResponse {
  try {
    const headersList = await headers()

    // TODO: figure out how to use geolocation form vercel functions...

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

    const data: SpeedRunDatabaseInsert = {
      username,
      time,
      date,
      ip,
      country: country ?? null,
      attempt,
      flag: flag ?? null,
    }

    console.warn('Submitting speedrun data:', data)

    const validatedData = speedrunDatabaseInsertSchema.parse(data)
    const sql = neon(process.env.DATABASE_URL!)

    // TODO: Rename this table.
    const insert = await sql`
      INSERT INTO "quizroller_speedrun" (username, time, date, ip, country, flag, attempt) 
      VALUES (${validatedData.username}, ${validatedData.time}, ${validatedData.date}, ${validatedData.ip}, ${validatedData.country}, ${validatedData.flag}, ${validatedData.attempt})
      RETURNING id, username, time, date, ip, country, flag, attempt
    `
    if (!insert || insert.length === 0) throw new Error('No data returned from insert')

    const parsedInsert = speedrunDatabaseSchema.parse(insert[0])
    console.log('Inserted speedrun:', parsedInsert)

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
