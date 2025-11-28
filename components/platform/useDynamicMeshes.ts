import { HIDDEN_POSITION, IndexedPlacement } from '@/utils/tiles'
import { useCallback, useEffect, useRef, useState, type RefObject, createRef } from 'react'
import { Mesh } from 'three'

const createMeshRefsFromCount = (count: number): RefObject<Mesh | null>[] =>
  Array.from({ length: count }, () => createRef<Mesh | null>())

const createInitialVisibilityState = (count: number): boolean[] =>
  Array.from({ length: count }, () => false)

function useDynamicMeshes(totalCount: number, positionOffset = [0, 0, 0]) {
  const [refs, setRefs] = useState(() => createMeshRefsFromCount(totalCount))
  const [isVisibleStates, setIsVisibleStates] = useState<boolean[]>(() =>
    createInitialVisibilityState(totalCount),
  )

  useEffect(() => {
    if (refs.length === totalCount) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsVisibleStates(createInitialVisibilityState(totalCount))
    setRefs(createMeshRefsFromCount(totalCount))
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

  const setMeshPosition = useCallback(
    (index: number, x: number, y: number, z: number) => {
      const body = refs[index]
      if (!body?.current) return false
      translation.current.x = x + positionOffset[0]
      translation.current.y = y + positionOffset[1]
      translation.current.z = z + positionOffset[2]
      body.current.position.set(
        translation.current.x,
        translation.current.y,
        translation.current.z,
      )
      return true
    },
    [positionOffset, refs],
  )

  const hideMeshAtIndex = useCallback(
    (index: number) => {
      if (index < 0 || index >= refs.length) return
      setMeshPosition(index, HIDDEN_POSITION[0], HIDDEN_POSITION[1], HIDDEN_POSITION[2])
      setIsVisibleState(index, false)
    },
    [refs.length, setMeshPosition, setIsVisibleState],
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
      if (!setMeshPosition(contentIndex, x, y, targetZ)) return
      setIsVisibleState(contentIndex, true)
    },
    [refs.length, setMeshPosition, setIsVisibleState],
  )

  return {
    refs,
    isVisibleStates,
    translation,
    hideMeshAtIndex,
    applyPlacement,
  }
}

export default useDynamicMeshes
