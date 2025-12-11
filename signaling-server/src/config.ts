export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080
export const MAX_PEERS_PER_ROOM = process.env.MAX_PEERS_PER_ROOM
  ? parseInt(process.env.MAX_PEERS_PER_ROOM, 10)
  : 2
