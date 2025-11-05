import { ArrowUpRight } from 'lucide-react'
import type { FC } from 'react'

import Card from '@/components/ui/Card'

export { Card }

type CreditProps = {
  role: string
  name: string
  url?: string
}

export const Credit: FC<CreditProps> = ({ role, name, url }) => {
  return (
    <div className="py-1">
      <span className="mb-1 block text-xs leading-none text-black/70 uppercase">{role}</span>
      {!!url ? (
        <a
          href={url}
          className="paragraph-sm flex items-center gap-1 font-semibold"
          target="_blank"
          rel="noopener noreferrer">
          {name}
          <ArrowUpRight size={16} strokeWidth={2.5} />
        </a>
      ) : (
        <span className="paragraph-sm font-semibold">{name}</span>
      )}
    </div>
  )
}
