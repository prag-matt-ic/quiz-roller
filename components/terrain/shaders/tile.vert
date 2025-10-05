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
varying vec3 vInstanceCenter;
varying vec3 vWorldPos;
varying float vSeed;

void main() {
  // Compute world position for current vertex of the instance
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;

  // Compute instance center in world space once per vertex (constant per instance)
  vInstanceCenter = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;

  // Fade only for open tiles as they enter the threshold window
  float denom = max(0.0001, (uEntryEndZ - uEntryStartZ));
  float t = clamp((worldPos.z - uEntryStartZ) / denom, 0.0, 1.0);
  // Small per-instance jitter to desynchronize fade timing
  float jitter = (instanceSeed - 0.5) * 0.2; // +/-0.1 in normalized window
  // If instanceOpen == 0.0, keep alpha at 1.0 (no fade)
  vAlpha = mix(1.0, clamp(t + jitter, 0.0, 1.0), clamp(instanceOpen, 0.0, 1.0));

  // Pass seed to fragment for noise offset
  vSeed = instanceSeed;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
