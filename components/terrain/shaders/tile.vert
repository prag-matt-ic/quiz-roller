// Instanced tile fade vertex shader
// - instanceOpen: 1.0 for open tiles, 0.0 for blocked
// - instanceBaseY: base Y assigned for the instance (for reference/extension)
// - uEntryStartZ/uEntryEndZ: world-Z window over which open tiles fade in
// - uPlayerWorldPos: player world-space position for simple tile highlighting

attribute float instanceOpen;
attribute float instanceBaseY;
attribute float instanceSeed;

uniform float uEntryStartZ;
uniform float uEntryEndZ;
uniform vec3 uPlayerWorldPos;

varying float vAlpha;
varying float vPlayerHighlight;
varying vec3 vWorldPos;
varying float vSeed;

void main() {
  // Compute combined model-instance matrix once and reuse
  mat4 modelInstanceMatrix = modelMatrix * instanceMatrix;
  // Compute world position for current vertex of the instance
  vec4 worldPos = modelInstanceMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;

  // Compute instance center in world space once per vertex (constant per instance)
  vec3 instanceCenter = (modelInstanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  // Precompute highlight based on distance to player in the vertex shader.
  const float PLAYER_IMPACT_RADIUS = 1.75; // world units
  float dist = distance(instanceCenter, uPlayerWorldPos);
  vPlayerHighlight = smoothstep(PLAYER_IMPACT_RADIUS, 0.0, dist);

  // Fade only for open tiles as they enter the threshold window.
  // Seed adjusts the speed (curve shape) but preserves endpoints:
  // tBase == 0 at entry start, 1 at entry end; alpha remains 0 before start and 1 after end.
  float denom = max(0.0001, (uEntryEndZ - uEntryStartZ));
  float tBase = clamp((worldPos.z - uEntryStartZ) / denom, 0.0, 1.0);
  // Map seed into an exponent to speed up or slow down the ramp without shifting start/end.
  // <1.0 => faster start (ease-out), >1.0 => slower start (ease-in).
  float speedExp = mix(0.75, 1.35, clamp(instanceSeed, 0.0, 1.0));
  float t = pow(tBase, speedExp);
  // If instanceOpen == 0.0, keep alpha at 1.0 (no fade)
  vAlpha = mix(1.0, t, clamp(instanceOpen, 0.0, 1.0));

  // Pass seed to fragment for noise offset
  vSeed = instanceSeed;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
