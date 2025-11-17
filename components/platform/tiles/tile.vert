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
uniform float uFadeLiftHeight;

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

  // Offset tiles downward when faded out, bring them back to baseline as they appear
  float fadeLift = (radialAlpha - 1.0) * uFadeLiftHeight;
  worldPos.y += fadeLift;
  vWorldPos = worldPos.xyz;

  // Pass seed to fragment for noise offset
  vSeed = seed;

  // Pass isHighlighted to fragment shader
  vIsHighlighted = isHighlighted;

  vUv = uv;

  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
