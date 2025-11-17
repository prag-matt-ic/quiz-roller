// Instanced tile fade vertex shader
// - visibility: 1.0 for open (safe) tiles, 0.0 otherwise
// - uPlayerWorldPos: player world-space position for proximity-driven alpha/highlight

attribute float visibility;
attribute float seed;
attribute float isHighlighted;

uniform vec3 uPlayerWorldPos;
uniform float uHighlightRadius;
uniform float uFadeFullRadius;
uniform float uFadeMinRadius;
uniform float uFadeMinAlpha;

const float TILE_FADE_ROTATE_MAX = 0.6;
const float AXIS_EPSILON = 0.001;

float hashFloat(float n) {
  return fract(sin(n) * 43758.5453123);
}

vec3 rotateAroundAxis(vec3 v, vec3 axis, float angle) {
  float s = sin(angle);
  float c = cos(angle);
  return v * c + cross(axis, v) * s + axis * dot(axis, v) * (1.0 - c);
}

varying mediump float vAlpha;
varying mediump float vPlayerHighlight;
varying highp vec3 vWorldPos;
varying mediump vec3 vWorldNormal;
varying mediump float vSeed;
varying mediump float vIsHighlighted;
varying mediump vec2 vUv;

void main() {
  // Compute combined model-instance matrix once and reuse
  mat4 modelInstanceMatrix = modelMatrix * instanceMatrix;
  mat3 linearPart = mat3(modelInstanceMatrix);

  // Compute world position for current vertex of the instance
  vec4 worldPos = modelInstanceMatrix * vec4(position, 1.0);

  // Compute world-space normal (approximate by applying linear part of modelInstanceMatrix)
  // This is sufficient for axis-aligned boxes used for tiles
  vWorldNormal = normalize(linearPart * normal);

  // Compute instance center in world space once per vertex (constant per instance)
  vec3 instanceCenter = modelInstanceMatrix[3].xyz;

  // Precompute highlight based on distance to player in the vertex shader.
  vec3 playerOffset = instanceCenter - uPlayerWorldPos;
  float distSq = dot(playerOffset, playerOffset);
  float radiusSq = uHighlightRadius * uHighlightRadius;
  vPlayerHighlight = smoothstep(radiusSq, 0.0, distSq);

  // Alpha is controlled by a radial falloff around the player.
  float visible = clamp(visibility, 0.0, 1.0);
  float fullRadiusSq = uFadeFullRadius * uFadeFullRadius;
  float minRadiusSq = uFadeMinRadius * uFadeMinRadius;
  float fadeDenom = max(0.0001, (minRadiusSq - fullRadiusSq));
  float fadeT = clamp((distSq - fullRadiusSq) / fadeDenom, 0.0, 1.0);
  float radialAlpha = mix(1.0, uFadeMinAlpha, fadeT);
  vAlpha = radialAlpha * visible;

  // Apply per-instance tilt based on fade, but keep highlighted tiles steady
  float highlightMask = step(0.5, isHighlighted);
  float fadeAmount = (1.0 - radialAlpha) * (1.0 - highlightMask);
  float axisSeedX = hashFloat(seed * 3.173);
  float axisSeedZ = hashFloat(seed * 7.921);
  vec3 tiltAxis = vec3(axisSeedX - 0.5, 0.0, axisSeedZ - 0.5);
  float axisLength = max(length(tiltAxis), AXIS_EPSILON);
  tiltAxis /= axisLength;

  float signedNoise = hashFloat(seed * 11.0) * 2.0 - 1.0;
  float tiltAngle = fadeAmount * TILE_FADE_ROTATE_MAX * signedNoise;

  vec3 centeredPos = worldPos.xyz - instanceCenter;
  centeredPos = rotateAroundAxis(centeredPos, tiltAxis, tiltAngle);
  worldPos.xyz = centeredPos + instanceCenter;
  vWorldNormal = normalize(rotateAroundAxis(vWorldNormal, tiltAxis, tiltAngle));
  vWorldPos = worldPos.xyz;

  // Pass seed to fragment for noise offset
  vSeed = seed;

  // Pass isHighlighted to fragment shader
  vIsHighlighted = isHighlighted;

  vUv = uv;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
