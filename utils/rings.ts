import { type RingIndex } from '@/stores/types'

export const makeRingKey = (rowIndex: number, columnIndex: number): string =>
  `${rowIndex}:${columnIndex}`

export const ringIndexToKey = (ringIndex: RingIndex): string =>
  makeRingKey(ringIndex[0], ringIndex[1])
