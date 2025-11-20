'use server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { type SpeedRunDatabase, speedrunSchema, type SpeedRunSubmission } from '@/model/schema'
import { neon } from '@neondatabase/serverless'

export async function getSpeedrunData() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const speedruns = await sql`
      SELECT username, time, date, country, flag
      FROM "quizroller_speedrun" 
      ORDER BY time ASC
      LIMIT 10
    `

    return speedruns
  } catch (error) {
    console.error('Error fetching speedruns:', error)
    return []
  }
}

export async function submitSpeedrun({
  username,
  date,
  time,
  attempt = 1,
}: SpeedRunSubmission) {
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

    const data: SpeedRunDatabase = {
      username,
      time,
      date,
      ip,
      country: country ?? null,
      attempt,
      flag: flag ?? null,
    }

    console.warn('Submitting speedrun data:', data)

    const validatedData = speedrunSchema.parse(data)
    const sql = neon(process.env.DATABASE_URL!)

    // tagged template
    // TODO: Rename this table.
    await sql`
      INSERT INTO "quizroller_speedrun" (username, time, date, ip, country, flag, attempt) 
      VALUES (${validatedData.username}, ${validatedData.time}, ${validatedData.date}, ${validatedData.ip}, ${validatedData.country}, ${validatedData.flag}, ${validatedData.attempt})
    `
    return { success: true }
  } catch (error) {
    console.error('Error submitting speedrun:', error)

    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: 'Validation failed: ' + error.issues.map((e) => e.message).join(', '),
      }
    }
    return {
      success: false,
      error: 'Failed to submit speedrun',
    }
  }
}
