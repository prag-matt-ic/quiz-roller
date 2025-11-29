import { RapierRigidBody } from '@react-three/rapier'
import { type RefObject, createRef, useCallback, useEffect, useRef, useState } from 'react'

import { HIDDEN_POSITION, IndexedPlacement } from '@/utils/tiles'

const createRigidBodyRefsFromCount = (count: number): RefObject<RapierRigidBody | null>[] =>
  Array.from({ length: count }, () => createRef<RapierRigidBody | null>())

const createInitialVisibilityState = (count: number): boolean[] =>
  Array.from({ length: count }, () => false)

function useDynamicRigidBodies(totalCount: number) {
  const [refs, setRefs] = useState(() => createRigidBodyRefsFromCount(totalCount))
  const [isVisibleStates, setIsVisibleStates] = useState<boolean[]>(() =>
    createInitialVisibilityState(totalCount),
  )

  useEffect(() => {
    if (refs.length === totalCount) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRefs(createRigidBodyRefsFromCount(totalCount))
    setIsVisibleStates(createInitialVisibilityState(totalCount))
  }, [totalCount, refs.length])

  const setIsVisibleState = useCallback((index: number, isVisible: boolean) => {
    setIsVisibleStates((prev) => {
      if (prev[index] === isVisible) return prev
      const next = [...prev]
      next[index] = isVisible
      return next
    })
  }, [])

  const translation = useRef({
    x: HIDDEN_POSITION[0],
    y: HIDDEN_POSITION[1],
    z: HIDDEN_POSITION[2],
  })

  const setRigidBodyPosition = useCallback(
    (index: number, x: number, y: number, z: number) => {
      const body = refs[index]
      if (!body?.current) {
        console.warn('[setRigidBodyPosition] Invalid body reference', {
          index,
          poolSize: refs.length,
        })
        return
      }
      translation.current.x = x
      translation.current.y = y
      translation.current.z = z
      body.current.setTranslation(translation.current, true)
    },
    [refs, translation],
  )

  const hideRigidBodyAtIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= refs.length) {
        console.warn('[hideRigidBodyAtIndex] Invalid hide index', {
          index,
          poolSize: refs.length,
        })
        return
      }
      setRigidBodyPosition(index, HIDDEN_POSITION[0], HIDDEN_POSITION[1], HIDDEN_POSITION[2])
      setIsVisibleState(index, false)
    },
    [refs.length, setRigidBodyPosition, setIsVisibleState],
  )

  const applyPlacement = useCallback(
    (placement: IndexedPlacement, rowZ: number) => {
      const [x, y, relativeZ, contentIndex] = placement
      if (contentIndex < 0 || contentIndex >= refs.length) {
        console.error('[applyPlacement] Invalid placement index', {
          placement,
          poolSize: refs.length,
        })
        return
      }
      const targetZ = rowZ + relativeZ
      setRigidBodyPosition(contentIndex, x, y, targetZ)
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
