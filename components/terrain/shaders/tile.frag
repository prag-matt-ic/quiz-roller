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

const float DARKEN_FACTOR = 0.66; // 50% darker
const float UP_THRESHOLD = 0.5;  // treat faces with dot(up, normal) >= 0.5 as "up"

void main() {
  // Fade applies to all tiles; discard until fade begins
  if (vAlpha <= 0.001) discard;

  // Determine if this instance sits under an answer tile
  float hasAnswer = step(0.5, vAnswerNumber);

  // Answer tiles: fade-in to 1.0 (no seed-based cap)
  // Non-answer tiles: fade-in but may cap alpha based on seed.
  // Use a branch-reduced approach to avoid nested conditionals.
  float alpha = vAlpha;
  float applyCap = (1.0 - hasAnswer) * step(0.5, vSeed);
  // Map seed from [0.3, 1.0] to maxAlpha [0.6, 1.0]
  float tSeed = clamp((vSeed - 0.3) / 0.7, 0.0, 1.0);
  float maxAlpha = mix(0.8, 1.0, tSeed);
  alpha = mix(alpha, min(alpha, maxAlpha), applyCap);

  // Distance-based highlight precomputed in vertex shader
  float highlight = vPlayerHighlight;
  vec3 worldPosScaled = vWorldPos * 0.1;

  // Compute noise with slight per-instance offset using seed and scroll offset
  vec3 bgNoisePos = (worldPosScaled + vec3(vSeed * 0.1, -vSeed * 0.1, -uScrollZ * 0.12 ));
  float bgNoise = noise(bgNoisePos);
  float bgInput = clamp(bgNoise * 0.5 + 0.5, 0.0, 1.0);
  vec3 bgColour = getColourFromPalette(bgInput);

    // Use hasAnswer to determine mix amount: 0.16 (no answer) or 0.05 (has answer)
  float mixAmount = mix(0.5, 0.1, hasAnswer);
  vec3 background = mix(vec3(1.0), bgColour, mixAmount);

  if (highlight > 0.01) {
    float highlightNoise = noise(worldPosScaled);
    float highlightInput = clamp(highlightNoise * 0.5 + 0.5, 0.0, 1.0);
    vec3 highlightColour = mix(vec3(1.0), getColourFromPalette(highlightInput), 0.8);
    background = mix(background, highlightColour, highlight);
    // Keep highlight from overriding early fade-in completely; boost slightly.
    alpha = max(alpha, min(1.0, alpha + highlight * 0.5));
  }

  // Darken faces that are not facing world up (y-axis)
  // Sides/bottom get 50% intensity, top stays at 100%

  float upDot = clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), -1.0, 1.0);
  float isFacingUp = step(UP_THRESHOLD, upDot); // 1.0 for mostly-upward faces, 0.0 otherwise
  float shade = mix(DARKEN_FACTOR, 1.0, isFacingUp);
  background *= shade;

  gl_FragColor = vec4(background, alpha);
}
