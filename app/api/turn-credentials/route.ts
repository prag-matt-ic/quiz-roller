import { NextResponse } from 'next/server'

const METERED_API_KEY = process.env.METERED_API_KEY
const METERED_APP_NAME = process.env.METERED_APP_NAME || 'quiz-roller'

export async function GET() {
  if (!METERED_API_KEY) {
    console.error('[TURN] METERED_API_KEY not configured')
    return NextResponse.json({ error: 'TURN server not configured' }, { status: 500 })
  }

  try {
    const response = await fetch(
      `https://${METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`,
      { next: { revalidate: 3600 } },
    )

    if (!response.ok) {
      console.error(`[TURN] Metered API error: ${response.status}`)
      throw new Error(`Metered API error: ${response.status}`)
    }

    return NextResponse.json(await response.json())
  } catch (error) {
    console.error('[TURN] Failed to fetch credentials:', error)
    return NextResponse.json({ error: 'Failed to fetch TURN credentials' }, { status: 500 })
  }
}
