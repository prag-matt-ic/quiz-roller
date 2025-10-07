/**
 * Position computation shader for FloatingTiles
 * 
 * Stores and updates position (xyz) and alpha for each floating tile instance.
 * Alpha is computed based on Y position:
 * - Fade in: 0% → 100% during first 20% of journey
 * - Full opacity: middle 60%
 * - Fade out: 100% → 0% during final 20%
 * 
 * Data layout (RGBA):
 * - R: x position
 * - G: y position
 * - B: z position
 * - A: alpha (opacity)
 */

uniform float uDeltaTime;
uniform float uYMin;
uniform float uYMax;
uniform float uGridCols;
uniform float uTerrainCols; // number of terrain columns in the middle band
uniform float uTileSize;
uniform float uZMinRow;
uniform float uZMaxRow;
uniform float uZFadeStart; // world units where Z fade starts
uniform float uZFadeEnd;   // world units where Z fade ends
uniform float uCameraZ;    // camera world-space Z (for camera-relative fade)

// Store per-instance speed using a separate storage strategy
// We'll encode speed in the initial position data and maintain it across frames

// Simple pseudo-random function based on position
float rand(vec2 co) {
  return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Convert column index to world X position
float colToXForGrid(float col, float gridCols) {
  return (col - gridCols / 2.0 + 0.5) * uTileSize;
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 posData = texture2D(texturePosition, uv);
  
  vec3 position = posData.xyz;
  
  // Use deterministic speed based on UV (consistent per instance across frames)
  float seed = rand(uv);
  float speed = 0.6 + seed * 0.6; // Range [0.6, 1.2]
  
  // Update Y position
  float newY = position.y + speed * uDeltaTime;
  
  // Check if particle needs to recycle
  if (newY > uYMax) {
    // Respawn at bottom with new random X and Z
    // Use UV as seed for randomness
    float seed1 = rand(uv + vec2(newY));
    float seed2 = rand(uv * 2.0 + vec2(newY));
    float seed3 = rand(uv * 3.0 + vec2(newY));
    
    // Choose random column from allowed range
    // Note: This is simplified - ideally we'd pass allowed columns as uniform
    // For now, we'll use the outer bands (0 to middleStart) and (middleEnd to gridCols)
  float middleStart = (uGridCols - uTerrainCols) / 2.0;
  float middleEnd = middleStart + (uTerrainCols - 1.0);
    
    // Randomly choose left or right band
    float isRightBand = step(0.5, seed1);
    float col;
    if (isRightBand > 0.5) {
      // Right band: middleEnd+1 to gridCols-1
      col = middleEnd + 1.0 + floor(seed2 * (uGridCols - middleEnd - 1.0));
    } else {
      // Left band: 0 to middleStart-1
      col = floor(seed2 * middleStart);
    }
    
    position.x = colToXForGrid(col, uGridCols);
    
    // Reset Y to bottom
    newY = uYMin;
    
    // Choose random Z row
    float zRowRange = uZMaxRow - uZMinRow + 1.0;
    float rowZ = uZMinRow + floor(seed3 * zRowRange);
    position.z = rowZ * uTileSize;
  }
  
  position.y = newY;
  
  // Calculate base alpha based on normalized Y position (0.0 = bottom, 1.0 = top)
  float normalizedY = (position.y - uYMin) / (uYMax - uYMin);
  normalizedY = clamp(normalizedY, 0.0, 1.0);
  
  // Smooth, continuous fade using two smoothsteps: fade-in (0.0->0.2), fade-out (0.8->1.0)
  float fadeIn = smoothstep(0.0, 0.2, normalizedY);
  float fadeOut = 1.0 - smoothstep(0.8, 1.0, normalizedY);
  float alpha = fadeIn * fadeOut;

  // Apply Z distance-based fade relative to camera Z.
  // If distance along Z from camera is <= start => no fade, >= end => fully faded.
  float zDist = abs(position.z - uCameraZ);
  float zFade = 1.0 - smoothstep(uZFadeStart, uZFadeEnd, zDist);
  alpha *= zFade;
  
  gl_FragColor = vec4(position, alpha);
}
