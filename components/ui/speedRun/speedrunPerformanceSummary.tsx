import { type ReactNode } from 'react'

export type PerformanceSummaryInput = {
  latestRunTimeS: number | null
  latestRunRank: number | null
  leaderboardCount: number
  bestLeaderboardTimeS: number | null
  previousBestTimeS: number | null
  totalRunsCompleted: number
}

export type PerformanceSummary = {
  heading: ReactNode
  description: ReactNode
}

export const getSpeedrunPerformanceSummary = ({
  latestRunTimeS,
  latestRunRank,
  leaderboardCount,
  bestLeaderboardTimeS,
  previousBestTimeS,
  totalRunsCompleted,
}: PerformanceSummaryInput): PerformanceSummary => {
  if (!latestRunTimeS || latestRunTimeS <= 0) {
    return {
      heading: 'Great run!',
      description:
        'You completed the speedrun. Your time will appear here once it is available.',
    }
  }

  const formattedTime = latestRunTimeS.toFixed(2)
  const isFirstRun = totalRunsCompleted <= 1
  const hasPreviousBest = typeof previousBestTimeS === 'number'

  if (latestRunRank === 1) {
    return {
      heading: 'New world record!',
      description: (
        <>
          You set <b>the fastest time ever recorded</b> and claimed the <b>#1</b> spot on the
          global leaderboard.
        </>
      ),
    }
  }

  if (latestRunRank && latestRunRank > 1 && latestRunRank <= 3) {
    let deltaToFirst: string | null = null
    if (bestLeaderboardTimeS && bestLeaderboardTimeS > 0) {
      const diff = latestRunTimeS - bestLeaderboardTimeS
      if (diff > 0.005) {
        deltaToFirst = diff.toFixed(2)
      }
    }

    return {
      heading: 'Podium finish!',
      description: deltaToFirst ? (
        <>
          You are now <b>#{latestRunRank}</b> globally with {formattedTime}s, just{' '}
          {deltaToFirst}s behind the world record.
        </>
      ) : (
        <>
          You are now <b>#{latestRunRank}</b> globally with {formattedTime}s on the global
          leaderboard.
        </>
      ),
    }
  }

  if (latestRunRank && latestRunRank > 3 && latestRunRank <= leaderboardCount) {
    return {
      heading: 'Elite speedroller!',
      description: (
        <>
          You reached <b>#{latestRunRank}</b> on the global leaderboard with {formattedTime}s.
          Excellent work!
        </>
      ),
    }
  }

  if (latestRunRank && latestRunRank > leaderboardCount) {
    return {
      heading: 'Nice run!',
      description: (
        <>
          You placed #${latestRunRank} globally with ${formattedTime}s. Keep pushing to break
          into the top ${leaderboardCount}.`
        </>
      ),
    }
  }

  if (isFirstRun) {
    return {
      heading: 'First run complete!',
      description: `You finished your first speedrun in ${formattedTime}s. Good job!`,
    }
  }

  if (hasPreviousBest && typeof previousBestTimeS === 'number') {
    const diff = previousBestTimeS - latestRunTimeS
    if (diff > 0.005) {
      const formattedPreviousBest = previousBestTimeS.toFixed(2)
      const formattedDiff = diff.toFixed(2)
      return {
        heading: 'New personal best!',
        description: `You ran ${formattedTime}s, beating your previous best of ${formattedPreviousBest}s by ${formattedDiff}s.`,
      }
    }
  }

  return {
    heading: 'Good effort!',
    description: `You completed the run in ${formattedTime}s. Keep refining your line to set a new personal best.`,
  }
}
