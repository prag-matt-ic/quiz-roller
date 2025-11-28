import { HIDDEN_POSITION, IndexedPlacement } from '@/utils/tiles'
import { RapierRigidBody } from '@react-three/rapier'
import { useCallback, useEffect, useRef, useState, type RefObject, createRef } from 'react'

const createRigidBodyRefsFromCount = (count: number): RefObject<RapierRigidBody | null>[] =>
  Array.from({ length: count }, () => createRef<RapierRigidBody | null>())

const createInitialVisibilityState = (count: number): boolean[] =>
  Array.from({ length: count }, () => false)

function useDynamicRigidBodies(totalCount: number, label?: string) {
  const [refs, setRefs] = useState(() => createRigidBodyRefsFromCount(totalCount))
  const [isVisibleStates, setIsVisibleStates] = useState<boolean[]>(() =>
    createInitialVisibilityState(totalCount),
  )

  if (!!label)
    console.log('useDynamicRigidBodies', { label, totalCount, refs, isVisibleStates })

  useEffect(() => {
    if (refs.length === totalCount) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsVisibleStates(createInitialVisibilityState(totalCount))
    setRefs(createRigidBodyRefsFromCount(totalCount))
  }, [refs.length, totalCount])

  const setIsVisibleState = useCallback((index: number, value: boolean) => {
    setIsVisibleStates((prev) => {
      if (prev[index] === value) return prev
      const next = [...prev]
      next[index] = value
      return next
    })
  }, [])

  const translation = useRef({ x: 0, y: 0, z: 0 })

  const setRigidBodyPosition = useCallback(
    (index: number, x: number, y: number, z: number) => {
      const body = refs[index]
      if (!body?.current) return false
      translation.current.x = x
      translation.current.y = y
      translation.current.z = z
      body.current.setTranslation(translation.current, true)
      return true
    },
    [refs, translation],
  )

  const hideRigidBodyAtIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= refs.length) return
      setRigidBodyPosition(index, HIDDEN_POSITION[0], HIDDEN_POSITION[1], HIDDEN_POSITION[2])
      setIsVisibleState(index, false)
    },
    [refs.length, setRigidBodyPosition, setIsVisibleState],
  )

  const applyPlacement = useCallback(
    (placement: IndexedPlacement, rowZ: number) => {
      const [x, y, relativeZ, contentIndex] = placement
      if (contentIndex < 0 || contentIndex >= refs.length) {
        console.warn('Invalid placement index', {
          placement,
          poolSize: refs.length,
        })
        return
      }
      const targetZ = rowZ + relativeZ
      if (!setRigidBodyPosition(contentIndex, x, y, targetZ)) return
      setIsVisibleState(contentIndex, true)
    },
    [refs.length, setRigidBodyPosition, setIsVisibleState],
  )

  return {
    refs,
    isVisibleStates,
    translation,
    hideRigidBodyAtIndex,
    applyPlacement,
  }
}

export default useDynamicRigidBodies
