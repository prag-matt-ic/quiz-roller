precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

varying float vAlpha;
varying vec3 vWorldPos;
varying float vSeed;
varying float vPlayerHighlight;
varying float vAnswerNumber;

void main() {
  if (vAlpha <= 0.001) discard;

  // Distance-based highlight precomputed in vertex shader
  float highlight = vPlayerHighlight;
  vec3 worldPosScaled = vWorldPos * 0.12;

  // Compute noise with slight per-instance offset using seed
  vec3 bgNoisePos = (worldPosScaled + vec3(vSeed * 0.3, 0.0, vSeed * 0.3));
  float bgNoise = noise(bgNoisePos);
  float bgInput = clamp(bgNoise * 0.5 + 0.5, 0.0, 1.0);
  vec3 bgColour = getColourFromPalette(bgInput);

  // Use step to determine mix amount: 0.16 (no answer) or 0.05 (has answer)
  // step(0.5, vAnswerNumber) returns 1.0 if vAnswerNumber >= 0.5, else 0.0
  float hasAnswer = step(0.5, vAnswerNumber);
  float mixAmount = mix(0.22, 0.1, hasAnswer);
  vec3 background = mix(vec3(1.0), bgColour, mixAmount);

  if (highlight > 0.01) {
    float highlightNoise = noise(worldPosScaled);
    float highlightInput = clamp(highlightNoise * 0.5 + 0.5, 0.0, 1.0);
    vec3 highlightColour = getColourFromPalette(highlightInput);
    background = mix(background, highlightColour, highlight);
  }

  gl_FragColor = vec4(background, vAlpha);
}
