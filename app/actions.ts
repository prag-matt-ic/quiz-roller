'use server'
import { z } from 'zod'
import { headers } from 'next/headers'
import { speedrunSchema } from '@/model/schema'
import { neon } from '@neondatabase/serverless'

export async function getSpeedrunData() {
  try {
    const sql = neon(process.env.DATABASE_URL!)

    const speedruns = await sql`
      SELECT name, time, date, country 
      FROM speedruns 
      ORDER BY time ASC
      LIMIT 10
    `

    return { success: true, data: speedruns }
  } catch (error) {
    console.error('Error fetching speedruns:', error)
    return { success: false, error: 'Failed to fetch speedruns' }
  }
}

export async function submitSpeedrun(formData: FormData) {
  try {
    const name = formData.get('name') as string
    const timeElapsed = formData.get('time') as string

    const headersList = await headers()

    const ip =
      headersList.get('x-forwarded-for')?.split(',')[0].trim() || // proxies
      headersList.get('x-real-ip') || // Nginx
      headersList.get('cf-connecting-ip') || // Cloudflare
      '127.0.0.1' // local

    const country =
      headersList.get('cf-ipcountry') || // Cloudflare
      headersList.get('x-vercel-ip-country') || // Vercel
      null // local

    const data = {
      name,
      time: parseFloat(timeElapsed),
      date: new Date().toISOString(),
      ip,
      country,
    }

    const validatedData = speedrunSchema.parse(data)
    const sql = neon(process.env.DATABASE_URL!)

    // tagged template
    await sql`
      INSERT INTO speedruns (name, time, date, ip, country) 
      VALUES (${validatedData.name}, ${validatedData.time}, ${validatedData.date}, ${validatedData.ip}, ${validatedData.country})
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
