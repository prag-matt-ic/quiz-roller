precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

uniform float uTime;
uniform float uColourRange; // Palette parameter [0,1] for user customization

varying vec3 vLocalPos;
varying vec3 vNormal;

void main() {
  // Generate seamless 3D noise in object space, normalize to [0,1]
  vec3 dir = normalize(vLocalPos);
  float n = noise(vec3(dir.x, dir.y, dir.z) * 0.3 + uTime * 0.08);
  float noiseValue = clamp(n * 0.5 + 0.5, 0.0, 1.0);

  // Map the user's colour choice to range bounds
  float rangeSize = 0.33; // Each range is 1/3 of palette
  float rangeMin, rangeMax;
  
  if (uColourRange < 0.33) {
    // Warm range: 0 - 0.32
    rangeMin = 0.0;
    rangeMax = 0.32;
  } else if (uColourRange < 0.67) {
    // Cool range: 0.33 - 0.66  
    rangeMin = 0.33;
    rangeMax = 0.66;
  } else {
    // Deep range: 0.67 - 1.0
    rangeMin = 0.67;
    rangeMax = 1.0;
  }
  
  // Use noise to vary within the selected range
  float t = mix(rangeMin, rangeMax, noiseValue);

  vec3 color = getColourFromPalette(t);
  gl_FragColor = vec4(color, 1.0);
}