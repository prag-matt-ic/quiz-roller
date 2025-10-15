import { type LevaCustomTheme } from 'leva/dist/declarations/src/styles'

export const LEVA_CONTROLS_THEME: LevaCustomTheme = {
  radii: {
    xs: '0px',
    sm: '0px',
    lg: '0px',
  },
  fontSizes: {
    root: '14px', // Increased from default 11px to 14px for better readability
  },
  sizes: {
    rootWidth: '480px', // Increased from default 280px for more width
    controlWidth: '220px', // Increased from default 160px for wider controls
    rowHeight: '28px', // Increased from default 24px for taller rows
    folderTitleHeight: '24px', // Increased from default 20px for taller folder titles
    numberInputMinWidth: '64px', // Increased from default 60px for easier number input
    titleBarHeight: '0px',
  },
  space: {
    sm: '8px', // Increased from default 6px
    md: '14px', // Increased from default 10px
    rowGap: '8px', // Increased from default 7px for more spacing between rows
    colGap: '8px', // Increased from default 7px for more spacing between columns
  },
  colors: {},
}
