export const PANEL_BASE_CLASSES =
  'h-full p-4 rounded-2xl border backdrop-blur-xl transition-all duration-300 hover:scale-[1.01]'

export const PANEL_VARIANTS = {
  dark: 'border-white/10 bg-black/40 hover:border-white/20 hover:bg-black/50',
  light: 'border-white/20 bg-white/10 hover:border-white/30 hover:bg-white/15',
  accent:
    'border-white/15 bg-gradient-to-br from-white/10 to-white/5 hover:from-white/15 hover:to-white/10',
} as const
