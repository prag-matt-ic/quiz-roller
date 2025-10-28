import { CheckCircle } from 'lucide-react'
import type { FC } from 'react'
import { twMerge } from 'tailwind-merge'

type Props = {
  className?: string
  assurances: string[]
  assuranceClassName?: string
}

const Assurances: FC<Props> = ({ className, assurances = [], assuranceClassName }) => {
  if (!assurances.length) return null
  return (
    <div className={twMerge('flex w-fit max-w-full flex-wrap justify-center gap-2', className)}>
      {assurances.map((assurance) => (
        <Assurance key={assurance} text={assurance} className={assuranceClassName} />
      ))}
    </div>
  )
}

const Assurance: FC<{ text: string; className?: string }> = ({ text, className }) => {
  return (
    <div
      className={twMerge(
        'paragraph-xs flex items-center gap-2 rounded-full bg-black/20 py-1.5 pr-3 pl-2 font-semibold text-white backdrop-blur-sm',
        className,
      )}>
      <CheckCircle className="text-teal-accent size-4" />
      {text}
    </div>
  )
}

export default Assurances
