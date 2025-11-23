'use client'

import { createContext, type FC, type PropsWithChildren, useContext, useState } from 'react'
import { useStore } from 'zustand'

import { createColourTextureStore } from './store/createColourTextureStore'
import type { ColourTextureStore } from './store/types'

const ColourTextureContext = createContext<ReturnType<typeof createColourTextureStore>>(
  undefined!,
)

type Props = PropsWithChildren

export const ColourTextureProvider: FC<Props> = ({ children }) => {
  const [store] = useState(() => createColourTextureStore())
  return <ColourTextureContext value={store}>{children}</ColourTextureContext>
}

export function useColourTextureStore<T>(selector: (state: ColourTextureStore) => T): T {
  const store = useContext(ColourTextureContext)
  if (!store) throw new Error('Missing ColourTextureProvider in the tree')
  return useStore(store, selector)
}

export function useColourTextureStoreAPI() {
  const store = useContext(ColourTextureContext)
  if (!store) throw new Error('Missing ColourTextureProvider in the tree')
  return store
}
