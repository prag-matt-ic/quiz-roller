// Instanced tile fade vertex shader
// - visibility: 1.0 for open (safe) tiles, 0.0 otherwise
// - uPlayerWorldPos: player world-space position for proximity-driven alpha/highlight

attribute float visibility;
attribute float seed;
attribute float isHighlighted;

uniform vec3 uPlayerWorldPos;

varying mediump float vAlpha;
varying mediump float vPlayerHighlight;
varying highp vec3 vWorldPos;
varying mediump vec3 vWorldNormal;
varying mediump float vSeed;
varying mediump float vIsHighlighted;
varying mediump vec2 vUv;

const float TILE_WORLD_UNITS = 1.0; // Matches TILE_SIZE (world units per row)

// Player proximity highlight settings
const float PLAYER_HIGHLIGHT_ROW_COUNT = 4.0;
const float PLAYER_HIGHLIGHT_RADIUS = PLAYER_HIGHLIGHT_ROW_COUNT * TILE_WORLD_UNITS;

// Radial fade settings (alpha)
const float PLAYER_FADE_FULL_OPACITY_ROWS = 6.0;
const float PLAYER_FADE_MIN_OPACITY_ROWS = 12.0;
const float PLAYER_FADE_MIN_ALPHA = 0.0;
const float PLAYER_FADE_FULL_RADIUS = PLAYER_FADE_FULL_OPACITY_ROWS * TILE_WORLD_UNITS;
const float PLAYER_FADE_MIN_RADIUS = PLAYER_FADE_MIN_OPACITY_ROWS * TILE_WORLD_UNITS;

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
  float radiusSq = PLAYER_HIGHLIGHT_RADIUS * PLAYER_HIGHLIGHT_RADIUS;
  vPlayerHighlight = smoothstep(radiusSq, 0.0, distSq);

  // Alpha is controlled by a radial falloff around the player.
  float visible = clamp(visibility, 0.0, 1.0);
  float fullRadiusSq = PLAYER_FADE_FULL_RADIUS * PLAYER_FADE_FULL_RADIUS;
  float minRadiusSq = PLAYER_FADE_MIN_RADIUS * PLAYER_FADE_MIN_RADIUS;
  float fadeDenom = max(0.0001, (minRadiusSq - fullRadiusSq));
  float fadeT = clamp((distSq - fullRadiusSq) / fadeDenom, 0.0, 1.0);
  float radialAlpha = mix(1.0, PLAYER_FADE_MIN_ALPHA, fadeT);
  vAlpha = radialAlpha * visible;

  // Pass seed to fragment for noise offset
  vSeed = seed;

  // Pass isHighlighted to fragment shader
  vIsHighlighted = isHighlighted;

  vUv = uv;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
