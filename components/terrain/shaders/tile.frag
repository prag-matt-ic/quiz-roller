precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

varying float vAlpha;
varying vec3 vWorldPos;
varying float vSeed;
varying float vPlayerHighlight;

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

  vec3 background = mix(vec3(1.0), bgColour, 0.16);

  if (highlight > 0.01) {
    float highlightNoise = noise(worldPosScaled);
    float highlightInput = clamp(highlightNoise * 0.5 + 0.5, 0.0, 1.0);
    vec3 highlightColour = getColourFromPalette(highlightInput);
    background = mix(background, highlightColour, highlight);
  }

  gl_FragColor = vec4(background, vAlpha);
}
