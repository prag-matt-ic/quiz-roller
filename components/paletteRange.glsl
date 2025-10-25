// Compute palette range bounds given an index (0,1,2)
// Branchless implementation using step to avoid dynamic flow control on GPUs.
// IMPORTANT: Keep these thresholds in sync with the TypeScript ranges in
// `components/palette.ts` (COLOUR_RANGES). If you change one, change the other.
void paletteRange(int bandIndex, out float minV, out float maxV) {
  // Config constants for palette ranges
  // Band 0 (low): [LOW_MIN..LOW_MAX]
  const float LOW_MIN = 0.0;
  const float LOW_MAX = 0.5;
  
  // Band 1 (mid): [MID_MIN..MID_MAX]
  const float MID_MIN = 0.25;
  const float MID_MAX = 0.75;
  
  // Band 2 (high): [HIGH_MIN..HIGH_MAX]
  const float HIGH_MIN = 0.5;
  const float HIGH_MAX = 1.0;

  // Branchless band selection using step functions
  float idx = float(bandIndex);
  float isLow  = 1.0 - step(0.5, idx);                 // idx < 0.5  -> 1, else 0
  float isMid  = step(0.5, idx) * (1.0 - step(1.5, idx)); // 0.5 <= idx < 1.5 -> 1
  float isHigh = step(1.5, idx);                        // idx >= 1.5 -> 1

  minV = isLow * LOW_MIN + isMid * MID_MIN + isHigh * HIGH_MIN;
  maxV = isLow * LOW_MAX + isMid * MID_MAX + isHigh * HIGH_MAX;
}

// Export for use in other shaders
#pragma glslify: export(paletteRange)
