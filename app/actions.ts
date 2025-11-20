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
  // TODO: move  Promise<SpeedRunDatabase | null> into a type in the schema and use in the time store setup...
}: SpeedRunSubmission): Promise<SpeedRunDatabase | null> {
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
    const result = await sql`
      INSERT INTO "quizroller_speedrun" (username, time, date, ip, country, flag, attempt) 
      VALUES (${validatedData.username}, ${validatedData.time}, ${validatedData.date}, ${validatedData.ip}, ${validatedData.country}, ${validatedData.flag}, ${validatedData.attempt})
    `

    console.log('Speedrun submitted successfully:', result)
    return validatedData
  } catch (error) {
    console.error('Error submitting speedrun:', error)

    if (error instanceof z.ZodError) {
      return null
    }
    return null
  }
}
