precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

varying float vAlpha;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying float vSeed;
varying float vPlayerHighlight;
varying float vAnswerNumber;

void main() {
  // Determine if this instance sits under an answer tile
  float hasAnswer = step(0.5, vAnswerNumber);
  // Only discard fully transparent tiles that are not answer tiles
  if (vAlpha <= 0.001 && hasAnswer < 0.5) discard;

  // For answer tiles, alpha should always be 1.0 (no fade).
  // For non-answer tiles, apply fade and optional seed-based max opacity.
  float alpha = (hasAnswer > 0.5) ? 1.0 : vAlpha;
  if (vSeed > 0.5 && hasAnswer < 0.5) {
    // Map seed from [0.3, 1.0] to maxAlpha [0.3, 1.0]
    float t = (vSeed - 0.3) / 0.7; // normalize to [0, 1]
    float maxAlpha = mix(0.6, 1.0, t);
    alpha = min(alpha, maxAlpha);
  }

  // Distance-based highlight precomputed in vertex shader
  float highlight = vPlayerHighlight;
  vec3 worldPosScaled = vWorldPos * 0.12;

  // Compute noise with slight per-instance offset using seed
  vec3 bgNoisePos = (worldPosScaled + vec3(vSeed * 0.3, 0.0, vSeed * 0.3));
  float bgNoise = noise(bgNoisePos);
  float bgInput = clamp(bgNoise * 0.5 + 0.5, 0.0, 1.0);
  vec3 bgColour = getColourFromPalette(bgInput);

  // Use hasAnswer to determine mix amount: 0.16 (no answer) or 0.05 (has answer)
  float mixAmount = mix(0.4, 0.05, hasAnswer);
  vec3 background = mix(vec3(1.0), bgColour, mixAmount);
  // Respect fade-in alpha; do not force full opacity here.
  // If needed later, we can raise a minimum once fully raised (vAlpha ~ 1.0).

  if (highlight > 0.01) {
    float highlightNoise = noise(worldPosScaled);
    float highlightInput = clamp(highlightNoise * 0.5 + 0.5, 0.0, 1.0);
    vec3 highlightColour = getColourFromPalette(highlightInput);
    background = mix(background, highlightColour, highlight);
    // Keep highlight from overriding early fade-in completely; boost slightly.
    alpha = max(alpha, min(1.0, alpha + highlight * 0.35));
  }

  // Darken faces that are not facing world up (y-axis)
  // Sides/bottom get 50% intensity, top stays at 100%
  const float DARKEN_FACTOR = 0.66; // 50% darker
  const float UP_THRESHOLD = 0.5;  // treat faces with dot(up, normal) >= 0.5 as "up"
  float upDot = clamp(dot(normalize(vWorldNormal), vec3(0.0, 1.0, 0.0)), -1.0, 1.0);
  float isFacingUp = step(UP_THRESHOLD, upDot); // 1.0 for mostly-upward faces, 0.0 otherwise
  float shade = mix(DARKEN_FACTOR, 1.0, isFacingUp);
  vec3 shaded = background * shade;

  gl_FragColor = vec4(shaded, alpha);
}
