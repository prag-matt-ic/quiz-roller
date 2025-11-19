import { interactionGroups } from '@react-three/rapier'

const PLAYER_GROUP = 0
const RING_GROUP = 1
const COLLECTIBLE_GROUP = 2
const INFO_ZONE_GROUP = 3

export const COLLISION_GROUPS = {
  // Player colliders stay in their own group but filter against everything.
  player: interactionGroups([PLAYER_GROUP]),
  // Rings belong to their own group and only report intersections with the player.
  ringSensor: interactionGroups([RING_GROUP], [PLAYER_GROUP]),
  // Collectible tiles should only react to the player as well.
  collectibleSensor: interactionGroups([COLLECTIBLE_GROUP], [PLAYER_GROUP]),
  // Info zones should stay isolated from other sensors too.
  infoZoneSensor: interactionGroups([INFO_ZONE_GROUP], [PLAYER_GROUP]),
} as const
