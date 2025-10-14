// Marble fragment shader
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

  // Map the user's colour choice to range bounds (40% each with 10% overlap)
  float rangeMin, rangeMax;
  
  if (uColourRange < 0.35) {
    // Low range
    rangeMin = 0.0;
    rangeMax = 0.5;
  } else if (uColourRange < 0.65) {
    // Mid range
    rangeMin = 0.25;
    rangeMax = 0.75;
  } else {
    // High range
    rangeMin = 0.5;
    rangeMax = 1.0;
  }
  
  // Use noise to vary within the selected range
  float t = mix(rangeMin, rangeMax, noiseValue);

  vec3 color = getColourFromPalette(t);
  gl_FragColor = vec4(color, 1.0);
}