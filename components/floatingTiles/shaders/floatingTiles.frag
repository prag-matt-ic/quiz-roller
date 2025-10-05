#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

uniform float uMix; // blend strength for palette over black

varying vec3 vWorldPos;

void main() {
  // Simple world-space noise drives palette index
  vec3 p = vWorldPos * 0.12;
  float n = noise(p);
  float t = clamp(n * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = getColourFromPalette(t);

  // Darker look: blend palette over black (not white)
  vec3 base = mix(vec3(0.0), col, uMix);

  gl_FragColor = vec4(base, 1.0);
}

