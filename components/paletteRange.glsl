// Compute palette range bounds given an index (0,1,2)
// Branchless implementation using step to avoid dynamic flow control on GPUs.
// IMPORTANT: Keep these thresholds in sync with the TypeScript ranges in
// `components/palette.ts` (COLOUR_RANGES). If you change one, change the other.
void paletteRange(int bandIndex, out float minV, out float maxV) {
  // Bands: [0.0..0.4], [0.3..0.7], [0.6..1.0]
  float idx = float(bandIndex);
  float isLow  = 1.0 - step(0.5, idx);                 // idx < 0.5  -> 1, else 0
  float isMid  = step(0.5, idx) * (1.0 - step(1.5, idx)); // 0.5 <= idx < 1.5 -> 1
  float isHigh = step(1.5, idx);                        // idx >= 1.5 -> 1

  minV = isLow * 0.0 + isMid * 0.3 + isHigh * 0.6;
  maxV = isLow * 0.4 + isMid * 0.7 + isHigh * 1.0;
}

// Export for use in other shaders
#pragma glslify: export(paletteRange)
