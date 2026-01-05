import { NextResponse } from 'next/server'

const METERED_API_KEY = process.env.METERED_API_KEY
const METERED_APP_NAME = process.env.METERED_APP_NAME || 'quiz-roller'

export async function GET() {
  if (!METERED_API_KEY) {
    console.error('METERED_API_KEY not configured')
    return NextResponse.json({ error: 'TURN server not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://${METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`,
      { next: { revalidate: 3600 } }, // Cache for 1 hour
    )

    if (!response.ok) {
      throw new Error(`Metered API error: ${response.status}`)
    }

    const iceServers = await response.json()
    return NextResponse.json(iceServers)
  } catch (error) {
    console.error('Failed to fetch TURN credentials:', error)
    return NextResponse.json({ error: 'Failed to fetch TURN credentials' }, { status: 500 })
  }
}
