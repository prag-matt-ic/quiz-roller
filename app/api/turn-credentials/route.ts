import { NextResponse } from 'next/server'

const METERED_API_KEY = process.env.METERED_API_KEY
const METERED_APP_NAME = process.env.METERED_APP_NAME || 'quiz-roller'

export async function GET() {
  console.log('[API /turn-credentials] Request received')

  if (!METERED_API_KEY) {
    console.error('[API /turn-credentials] ❌ METERED_API_KEY not configured in environment')
    return NextResponse.json({ error: 'TURN server not configured' }, { status: 500 })
  }

  const url = `https://${METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY.substring(0, 8)}...`
  console.log(`[API /turn-credentials] Fetching from Metered: ${url}`)

  try {
    const response = await fetch(
      `https://${METERED_APP_NAME}.metered.live/api/v1/turn/credentials?apiKey=${METERED_API_KEY}`,
      { next: { revalidate: 3600 } }, // Cache for 1 hour
    )

    if (!response.ok) {
      const text = await response.text()
      console.error(
        `[API /turn-credentials] ❌ Metered API error: ${response.status} - ${text}`,
      )
      throw new Error(`Metered API error: ${response.status}`)
    }

    const iceServers = await response.json()
    console.log(`[API /turn-credentials] ✅ Got ${iceServers.length} ICE servers from Metered`)
    return NextResponse.json(iceServers)
  } catch (error) {
    console.error('[API /turn-credentials] ❌ Failed to fetch TURN credentials:', error)
    return NextResponse.json({ error: 'Failed to fetch TURN credentials' }, { status: 500 })
  }
}
