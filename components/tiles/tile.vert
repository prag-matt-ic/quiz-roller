// Instanced tile fade vertex shader
// - visibility: 1.0 for open (safe) tiles, 0.0 otherwise
// - uEntryStartZ/uEntryEndZ: world-Z window over which open tiles fade in
// - uExitStartZ/uExitEndZ: world-Z window over which tiles fade out
// - uPlayerWorldPos: player world-space position for simple tile highlighting

attribute float visibility;
attribute float seed;
attribute float answerNumber;

uniform float uEntryStartZ;
uniform float uEntryEndZ;
uniform vec3 uPlayerWorldPos;
uniform float uScrollZ;
uniform float uExitStartZ;
uniform float uExitEndZ;

varying mediump float vAlpha;
varying mediump float vPlayerHighlight;
varying highp vec3 vWorldPos;
varying mediump vec3 vWorldNormal;
varying mediump float vSeed;
varying mediump float vAnswerNumber;
varying mediump float vFadeOut;

const float PLAYER_IMPACT_RADIUS = 1.75; // world units

void main() {
  // Compute combined model-instance matrix once and reuse
  mat4 modelInstanceMatrix = modelMatrix * instanceMatrix;
  mat3 linearPart = mat3(modelInstanceMatrix);

  // Compute world position for current vertex of the instance
  vec4 worldPos = modelInstanceMatrix * vec4(position, 1.0);
  vWorldPos = worldPos.xyz;

  // Compute world-space normal (approximate by applying linear part of modelInstanceMatrix)
  // This is sufficient for axis-aligned boxes used for tiles
  vWorldNormal = normalize(linearPart * normal);

  // Compute instance center in world space once per vertex (constant per instance)
  vec3 instanceCenter = modelInstanceMatrix[3].xyz;

  // Precompute highlight based on distance to player in the vertex shader.
  vec3 playerOffset = instanceCenter - uPlayerWorldPos;
  float distSq = dot(playerOffset, playerOffset);
  float radiusSq = PLAYER_IMPACT_RADIUS * PLAYER_IMPACT_RADIUS;
  vPlayerHighlight = smoothstep(radiusSq, 0.0, distSq);

  // Fade only for open tiles as they enter the threshold window.
  // Seed adjusts the speed (curve shape) but preserves endpoints:
  // tBase == 0 at entry start, 1 at entry end; alpha remains 0 before start and 1 after end.
  float denom = max(0.0001, (uEntryEndZ - uEntryStartZ));
  float invDenom = 1.0 / denom;
  float tBase = clamp((worldPos.z - uEntryStartZ) * invDenom, 0.0, 1.0);
  // Map seed into an exponent to speed up or slow down the ramp without shifting start/end.
  // <1.0 => faster start (ease-out), >1.0 => slower start (ease-in).
  float speedExp = mix(0.6, 1.4, clamp(seed, 0.0, 1.0));
  float t = pow(tBase, speedExp);
  // Gate fade by visibility: 0 => invisible, 1 => fade by t
  vAlpha = t * clamp(visibility, 0.0, 1.0);

  // Compute fade-out factor based on exit window; 1.0 before window, 0.0 at/after end.
  float denomExit = max(0.0001, (uExitEndZ - uExitStartZ));
  float invDenomExit = 1.0 / denomExit;
  float tOut = clamp((worldPos.z - uExitStartZ) * invDenomExit, 0.0, 1.0);
  vFadeOut = 1.0 - tOut;

  // Pass seed to fragment for noise offset
  vSeed = seed;

  // Pass answer number to fragment shader
  vAnswerNumber = answerNumber;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
