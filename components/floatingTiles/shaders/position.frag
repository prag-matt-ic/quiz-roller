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

  precision highp float;
  precision highp int;

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

  const float SPEED_MIN = 0.3;
  const float SPEED_RANGE = 0.6;
  const float EPSILON = 1e-5;

  // Cheap 2D hash returning three decorrelated float components.
  vec3 hash3(vec2 p) {
    vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.11369, 0.13787));
    p3 += dot(p3, p3.yzx + 19.19);
    return fract((p3.xxy + p3.yzz) * p3.zyx);
  }

  // Convert column index to world X position
  float colToXForGrid(float col, float gridCols) {
    return (col - gridCols * 0.5 + 0.5) * uTileSize;
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution.xy;
    vec4 posData = texture2D(texturePosition, uv);
    vec3 position = posData.xyz;

    vec3 baseSeeds = hash3(uv);
    float speed = SPEED_MIN + baseSeeds.x * SPEED_RANGE; // Range [0.3, 0.9]
    float newY = position.y + speed * uDeltaTime;

    float safeGridCols = max(uGridCols, 1.0);
    float yRange = max(uYMax - uYMin, EPSILON);

    if (newY > uYMax) {
      vec3 respawnSeeds = hash3(uv + vec2(newY, position.z));

      float middleStart = 0.5 * (safeGridCols - uTerrainCols);
      float rightBandStart = middleStart + uTerrainCols;
      float leftBandCount = max(middleStart, 0.0);
      float rightBandCount = max(safeGridCols - rightBandStart, 0.0);

      float col = 0.0;

      if (rightBandCount > 0.0 && (respawnSeeds.x > 0.5 || leftBandCount <= 0.0)) {
        float rightIndex = floor(respawnSeeds.y * rightBandCount);
        col = rightBandStart + rightIndex;
      } else if (leftBandCount > 0.0) {
        float leftIndex = floor(respawnSeeds.y * leftBandCount);
        col = leftIndex;
      } else {
        float fallbackIndex = floor(respawnSeeds.y * safeGridCols);
        col = clamp(fallbackIndex, 0.0, safeGridCols - 1.0);
      }

      position.x = colToXForGrid(col, safeGridCols);
      newY = uYMin;

      float rowCount = max(uZMaxRow - uZMinRow + 1.0, 1.0);
      float rowZ = uZMinRow + floor(respawnSeeds.z * rowCount);
      position.z = rowZ * uTileSize;
    }

    position.y = newY;

    float normalizedY = clamp((position.y - uYMin) / yRange, 0.0, 1.0);
    vec2 fade = smoothstep(vec2(0.0), vec2(0.2), vec2(normalizedY, 1.0 - normalizedY));
    float alpha = fade.x * fade.y;

    float zDist = abs(position.z - uCameraZ);
    float zFade = 1.0 - smoothstep(uZFadeStart, uZFadeEnd, zDist);
    alpha *= zFade;

    gl_FragColor = vec4(position, alpha);
  }
