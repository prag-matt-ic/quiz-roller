// Instanced tile fade vertex shader
// - visibility: 1.0 for open (safe) tiles, 0.0 otherwise
// - uPlayerWorldPos: player world-space position for proximity-driven alpha/highlight

attribute float visibility;
attribute float seed;
attribute float isHighlighted;

uniform highp vec3 uPlayerWorldPos;
uniform float uHighlightRadius;
uniform float uFadeFullRadius;
uniform float uFadeMinRadius;
uniform float uFadeMinAlpha;

const float TILE_FADE_ROTATE_MAX = 0.3;
const float AXIS_EPSILON = 0.001;
const float UP_THRESHOLD = 0.5;
const float DARKEN_FACTOR = 0.4;

float hashFloat(float n) {
  return fract(sin(n) * 43758.5453);
}

vec3 rotateWithTrig(vec3 v, vec3 axis, float sinAngle, float cosAngle) {
  return v * cosAngle + cross(axis, v) * sinAngle + axis * dot(axis, v) * (1.0 - cosAngle);
}

varying mediump float vAlpha;
varying mediump float vPlayerHighlight;
varying highp vec3 vWorldPos;
varying mediump float vSeed;
varying mediump float vIsHighlighted;
varying mediump vec2 vUv;
varying lowp float vShade;
varying lowp float vDetailIndex;

void main() {
  // Compute combined model-instance matrix once and reuse
  mat4 modelInstanceMatrix = modelMatrix * instanceMatrix;
  mat3 linearPart = mat3(modelInstanceMatrix);

  // Compute world position for current vertex of the instance
  vec4 worldPos = modelInstanceMatrix * vec4(position, 1.0);

  // Compute world-space normal (approximate by applying linear part of modelInstanceMatrix)
  // Normalize after tilt so we do it once.
  vec3 rawNormal = linearPart * normal;

  // Compute instance center in world space once per vertex (constant per instance)
  vec3 instanceCenter = modelInstanceMatrix[3].xyz;

  // Precompute highlight based on distance to player in the vertex shader.
  vec2 playerOffset = instanceCenter.xz - uPlayerWorldPos.xz;
  float distSq = dot(playerOffset, playerOffset);
  float radiusSq = uHighlightRadius * uHighlightRadius;
  vPlayerHighlight = smoothstep(radiusSq, 0.0, distSq);

  // Alpha is controlled by a radial falloff around the player.
  float visible = clamp(visibility, 0.0, 1.0);
  float fullRadiusSq = uFadeFullRadius * uFadeFullRadius;
  float minRadiusSq = uFadeMinRadius * uFadeMinRadius;

  float fadeT = smoothstep(fullRadiusSq, minRadiusSq, distSq);
  float radialAlpha = mix(1.0, uFadeMinAlpha, fadeT);
  vAlpha = radialAlpha * visible;

  // Apply per-instance tilt based on fade, but keep highlighted tiles steady
  float highlightMask = step(0.5, isHighlighted);
  float fadeAmount = (1.0 - radialAlpha) * (1.0 - highlightMask);
  vec2 axisSeeds = vec2(hashFloat(seed * 3.17), hashFloat(seed * 7.92));
  vec3 tiltAxis = vec3(axisSeeds.x - 0.5, 0.0, axisSeeds.y - 0.5);
  float axisLength = max(length(tiltAxis), AXIS_EPSILON);
  tiltAxis /= axisLength;

  float signedNoise = hashFloat(seed * 11.0) * 2.0 - 1.0;
  float tiltAngle = fadeAmount * TILE_FADE_ROTATE_MAX * signedNoise;
  float tiltSin = sin(tiltAngle);
  float tiltCos = cos(tiltAngle);

  vec3 centeredPos = worldPos.xyz - instanceCenter;
  centeredPos = rotateWithTrig(centeredPos, tiltAxis, tiltSin, tiltCos);
  worldPos.xyz = centeredPos + instanceCenter;
  rawNormal = rotateWithTrig(rawNormal, tiltAxis, tiltSin, tiltCos);
  vec3 worldNormal = normalize(rawNormal);
  vWorldPos = worldPos.xyz;

  // Compute shading in vertex shader
  float upDot = dot(worldNormal, vec3(0.0, 1.0, 0.0));
  float isFacingUp = step(UP_THRESHOLD, upDot);
  vShade = mix(DARKEN_FACTOR, 1.0, isFacingUp);

  // Pass seed to fragment for noise offset
  vSeed = seed;

  // Pass isHighlighted to fragment shader
  vIsHighlighted = isHighlighted;

  // Precompute detail noise index so the fragment shader stays branch-light
  float detailHash = fract(sin(seed * 438.54));
  vDetailIndex = floor(detailHash * 3.0);

  vUv = uv;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
