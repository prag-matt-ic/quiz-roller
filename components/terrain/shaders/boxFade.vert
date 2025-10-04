// Instanced box fade vertex shader
// - instanceOpen: 1.0 for open tiles, 0.0 for blocked
// - instanceBaseY: base Y assigned for the instance (for reference/extension)
// - uEntryStartZ/uEntryEndZ: world-Z window over which open tiles fade in

attribute float instanceOpen;
attribute float instanceBaseY;

uniform float uEntryStartZ;
uniform float uEntryEndZ;

varying float vAlpha;

void main() {
  // Compute world position for current vertex of the instance
  vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);

  // Fade only for open tiles as they enter the threshold window
  float denom = max(0.0001, (uEntryEndZ - uEntryStartZ));
  float t = clamp((worldPos.z - uEntryStartZ) / denom, 0.0, 1.0);
  // If instanceOpen == 0.0, keep alpha at 1.0 (no fade)
  vAlpha = mix(1.0, t, clamp(instanceOpen, 0.0, 1.0));

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}

