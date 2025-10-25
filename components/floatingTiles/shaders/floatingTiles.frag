#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

precision mediump float;

uniform float uMix; // blend strength for palette over black

varying highp vec3 vNoiseCoord;
varying mediump float vAlpha;

void main() {
  float noiseValue = noise(vNoiseCoord);
  float paletteIndex = clamp(noiseValue * 0.5 + 0.5, 0.0, 1.0);
  vec3 paletteColor = getColourFromPalette(paletteIndex);
  vec3 baseColor = paletteColor * uMix;
  gl_FragColor = vec4(baseColor, vAlpha);
}

