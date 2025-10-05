// Instanced tile fade vertex shader
// - instanceOpen: 1.0 for open tiles, 0.0 for blocked
// - instanceBaseY: base Y assigned for the instance (for reference/extension)
// - uEntryStartZ/uEntryEndZ: world-Z window over which open tiles fade in
// - uPlayerWorldPos: player world-space position for simple tile highlighting

attribute float instanceOpen;
attribute float instanceBaseY;

uniform float uEntryStartZ;
uniform float uEntryEndZ;
uniform float uEntryLift; // world units to lift open tiles
uniform vec3 uPlayerWorldPos;
uniform sampler2D uPositions;
uniform float uColumns;
uniform float uRowsVisible;
uniform float uTileSize;
uniform float uBaseZOffset;
uniform float uZFront;
uniform float uScrollZ;

varying float vAlpha;
varying vec3 vInstanceCenter;

void main() {
  // Instance addressing
  #ifdef GL_EXT_draw_instanced
    // no-op, ensure extension presence for WebGL1 paths
  #endif
  float idx = float(gl_InstanceID);
  float col = mod(idx, uColumns);
  float row = floor(idx / uColumns);

  // Sample GPU sim Y offset per instance via gl_InstanceID
  vec2 texUv = vec2((col + 0.5) / uColumns, (row + 0.5) / uRowsVisible);
  vec4 posData = texture2D(uPositions, texUv);
  float jitterY = posData.y; // subtle GPU-driven offset

  // Analytic X/Z placement to avoid CPU per-frame updates
  float cycle = uRowsVisible * uTileSize;
  float z = -row * uTileSize + uBaseZOffset + mod(uScrollZ, cycle);
  if (z >= uZFront) z -= cycle;
  float x = (col - (uColumns * 0.5) + 0.5) * uTileSize;

  // Entry lift for open tiles only
  float denom = max(0.0001, (uEntryEndZ - uEntryStartZ));
  float tLift = clamp((z - uEntryStartZ) / denom, 0.0, 1.0);
  float entryYOffset = -uEntryLift * (1.0 - tLift);
  float baseY = instanceBaseY + (instanceOpen > 0.5 ? entryYOffset : 0.0) + jitterY;

  // Compose world position from local vertex offset around instance center
  vec4 worldPos = modelMatrix * vec4(position + vec3(x, baseY, z), 1.0);

  // Instance center for highlight
  vInstanceCenter = (modelMatrix * vec4(x, baseY, z, 1.0)).xyz;

  // Fade only for open tiles as they enter the threshold window
  float t = clamp((z - uEntryStartZ) / denom, 0.0, 1.0);
  // If instanceOpen == 0.0, keep alpha at 1.0 (no fade)
  vAlpha = mix(1.0, t, clamp(instanceOpen, 0.0, 1.0));
  // Optionally modulate by GPU-provided opacity (w)
  vAlpha *= posData.w;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
