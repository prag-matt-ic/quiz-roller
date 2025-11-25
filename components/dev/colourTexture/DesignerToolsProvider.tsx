'use client'

import { createContext, type FC, type PropsWithChildren, useContext, useState } from 'react'
import { useStore } from 'zustand'

import { createColourTextureStore } from './store/createColourTextureStore'
import type { ColourTextureStore } from './store/types'

const DesignerToolsContext = createContext<ReturnType<typeof createColourTextureStore>>(
  undefined!,
)

type Props = PropsWithChildren

export const DesignerToolsProvider: FC<Props> = ({ children }) => {
  const [store] = useState(() => createColourTextureStore())
  return <DesignerToolsContext value={store}>{children}</DesignerToolsContext>
}

export function useDesignerToolsStore<T>(selector: (state: ColourTextureStore) => T): T {
  const store = useContext(DesignerToolsContext)
  if (!store) throw new Error('Missing DesignerToolsProvider in the tree')
  return useStore(store, selector)
}

export function useDesignerToolsStoreAPI() {
  const store = useContext(DesignerToolsContext)
  if (!store) throw new Error('Missing DesignerToolsProvider in the tree')
  return store
}
