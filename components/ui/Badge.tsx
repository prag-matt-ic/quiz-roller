// import { type LucideIcon } from 'lucide-react'
// import { type FC, type ReactNode } from 'react'
// import { twJoin, twMerge } from 'tailwind-merge'

// export type BadgeProps = {
//   label: ReactNode
//   Icon: LucideIcon
//   withRing?: boolean
//   className?: string
//   colour?: Palette
//   size?: 'regular' | 'large'
// }

// const RING_CLASSES: Record<Palette, string> = {
//   orange: 'ring ring-orange-accent/25',
//   blue: 'ring ring-blue-accent/25',
//   teal: 'ring ring-teal-accent/25',
//   dynamic: 'ring ring-dynamic-accent/25',
// }

// const ICON_CLASSES: Record<Palette, string> = {
//   orange: 'text-orange-accent',
//   blue: 'text-blue-accent',
//   teal: 'text-teal-accent',
//   dynamic: 'text-dynamic-accent',
// }

// const Badge: FC<BadgeProps> = ({
//   label,
//   Icon,
//   className,
//   withRing = true,
//   colour = 'teal',
//   size = 'regular',
// }) => {
//   const ringClass = withRing ? RING_CLASSES[colour] : ''

//   const containerSize =
//     size === 'large'
//       ? 'gap-3 px-3.5 py-2.5 sm:px-4.5 sm:py-3'
//       : 'gap-2.5 px-2.5 py-2 sm:px-4 sm:py-2.5'

//   const iconSize = size === 'large' ? 24 : 20

//   return (
//     <div
//       className={twMerge(
//         `inline-flex w-fit items-center rounded-full bg-black/50 font-medium backdrop-blur-sm select-none`,
//         containerSize,
//         withRing && ringClass,
//         className,
//       )}>
//       <Icon className={twJoin(ICON_CLASSES[colour])} size={iconSize} strokeWidth={1.75} />
//       <span
//         className={twJoin(
//           'tracking-wide whitespace-nowrap text-white',
//           size === 'large' ? 'paragraph' : 'paragraph-sm',
//         )}>
//         {label}
//       </span>
//     </div>
//   )
// }
// export default Badge
