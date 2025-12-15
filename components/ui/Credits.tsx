'use client'

import type { FC } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = {
  className?: string
  show: boolean
}

const Credits: FC<Props> = ({ className, show }) => {
  return (
    <div
      className={twMerge(
        'flex w-full flex-wrap justify-center gap-2 text-sm leading-3 tracking-wide text-teal-50/70 opacity-0 transition-opacity duration-1000 xl:bottom-8',
        show && 'opacity-100 delay-500',
        className,
      )}>
      <span className="text-teal-50/40">By</span>
      <a
        href="https://github.com/prag-matt-ic"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold hover:text-teal-100">
        Pragmattic
      </a>
      <span className="text-teal-50/40">and</span>
      <a
        href="https://loopspeed.co.uk"
        target="_blank"
        rel="noopener noreferrer"
        className="font-semibold hover:text-teal-100">
        Loopspeed
      </a>
    </div>
  )
}

export default Credits
