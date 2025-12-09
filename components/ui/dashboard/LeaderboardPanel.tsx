'use client'
import { Joystick, Keyboard, Trophy, UsersRound } from 'lucide-react';
import { type FC } from 'react';

import { useGameStore } from '@/components/GameProvider'
import { ButtonGroup } from '@/components/ui/ButtonGroup'
import Panel from '@/components/ui/panel/Panel';
import { PanelHeader } from '@/components/ui/panel/PanelHeader';
import { LeaderboardTable } from '@/components/ui/speedRun/LeaderboardTable';
import { InputType } from '@/stores/types';


type Props = {
  className?: string
  count?: number
  showCTA?: boolean
  fetchLatestRun?: boolean
}

export const LeaderboardPanel: FC<Props> = ({
  className,
  count = 3,
  showCTA = true,
  fetchLatestRun = false,
}) => {
  const startCountdown = useGameStore((s) => s.startCountdown)
  const leaderboardFilter = useGameStore((s) => s.leaderboardFilter)
  const setLeaderboardFilter = useGameStore((s) => s.setLeaderboardFilter)

  return (
    <Panel strength={3} className={className} attractorClassName="bg-emerald-400/15">
      <PanelHeader icon={Trophy} label="Leaderboard" className="">
        <ButtonGroup
          value={leaderboardFilter}
          onChange={setLeaderboardFilter}
          items={[
            { label: 'Keyboard', value: InputType.KEYS, Icon: Keyboard },
            { label: 'Joystick', value: InputType.JOYSTICK, Icon: Joystick },
            { label: 'All', value: 'all', Icon: UsersRound },
          ]}
        />
      </PanelHeader>
      <LeaderboardTable
        count={count}
        fetchLatestRun={fetchLatestRun}
        startCountdown={startCountdown}
        showCTA={showCTA}
      />
    </Panel>
  )
}
