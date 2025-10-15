precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

uniform float uScrollZ;

varying float vAlpha;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vSeed;
varying float vPlayerHighlight;
varying float vAnswerNumber;
varying float vFadeOut;

// Constants
const float ANSWER_MIX = 0.1;
const float NON_ANSWER_MIX = 0.25;
const float DARKEN_FACTOR = 0.66;
const float UP_THRESHOLD = 0.5;
const float HIGHLIGHT_MIX = 0.95;
const float HIGHLIGHT_ALPHA_BOOST = 0.5;
const float ALPHA_CAP_MIN = 0.8;
const float ALPHA_CAP_MAX = 1.0;
const float SEED_CAP_THRESHOLD = 0.7;
const float SEED_RANGE_MIN = 0.3;
const float SEED_RANGE_MAX = 0.7;

void main() {
  // Early discard for fully transparent tiles
  if (vAlpha <= 0.001 || vFadeOut <= 0.001) discard;

  // Determine if this instance is an answer tile (branch-free)
  float hasAnswer = step(0.5, vAnswerNumber);

  // Calculate alpha with seed-based capping for non-answer tiles
  // Answer tiles: full fade-in (no cap)
  // Non-answer tiles: may cap alpha based on seed value
  float alpha = vAlpha;
  float shouldCapAlpha = (1.0 - hasAnswer) * step(SEED_CAP_THRESHOLD, vSeed);
  
  if (shouldCapAlpha > 0.5) {
    // Map seed from [0.3, 0.7] to maxAlpha [0.8, 1.0]
    float normalizedSeed = (vSeed - SEED_RANGE_MIN) / SEED_RANGE_MAX;
    float maxAlpha = mix(ALPHA_CAP_MIN, ALPHA_CAP_MAX, normalizedSeed);
    alpha = min(alpha, maxAlpha);
  }

  // Compute background color with scrolling noise
  vec3 worldPosScaled = vWorldPos * 0.1;
  vec3 bgNoisePos = worldPosScaled + vec3(vSeed * 0.1, -vSeed * 0.1, -uScrollZ * 0.12);
  float bgNoise = noise(bgNoisePos);
  float bgInput = bgNoise * 0.5 + 0.5; // Map from [-1,1] to [0,1]
  vec3 bgColour = getColourFromPalette(bgInput);

  // Mix with white based on tile type
  float mixAmount = mix(NON_ANSWER_MIX, ANSWER_MIX, hasAnswer);
  vec3 background = mix(vec3(1.0), bgColour, mixAmount);

  // Apply player proximity highlight
  if (vPlayerHighlight > 0.01) {
    vec3 highlightColour = mix(vec3(1.0), bgColour, HIGHLIGHT_MIX);
    background = mix(background, highlightColour, vPlayerHighlight);
    // Boost alpha during highlight
    alpha = max(alpha, alpha + vPlayerHighlight * HIGHLIGHT_ALPHA_BOOST);
  }

  // Darken non-upward-facing surfaces
  // vWorldNormal should already be normalized from vertex shader
  float upDot = dot(vWorldNormal, vec3(0.0, 1.0, 0.0));
  float isFacingUp = step(UP_THRESHOLD, upDot);
  float shade = mix(DARKEN_FACTOR, 1.0, isFacingUp);
  background *= shade;

  // Apply final fade-out
  gl_FragColor = vec4(background, alpha * vFadeOut);
}
