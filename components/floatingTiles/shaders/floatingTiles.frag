#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

uniform float uMix; // blend strength for palette over black

varying vec3 vWorldPos;
varying float vAlpha;

const float NOISE_SCALE = 0.12;

void main() {
  // Simple world-space noise drives palette index
  vec3 noisePosition = vWorldPos * NOISE_SCALE;
  float noiseValue = noise(noisePosition);
  float paletteIndex = clamp(noiseValue * 0.5 + 0.5, 0.0, 1.0);
  vec3 paletteColor = getColourFromPalette(paletteIndex);
  // Darker look: blend palette over black
  vec3 baseColor = mix(vec3(0.0), paletteColor, uMix);
  gl_FragColor = vec4(baseColor, vAlpha);
}

