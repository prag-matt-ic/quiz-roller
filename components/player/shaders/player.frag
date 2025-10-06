precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

uniform float uTime;

varying vec3 vLocalPos;
varying vec3 vNormal;

void main() {
  // Generate seamless 3D noise in object space, normalize to [0,1]
  vec3 dir = normalize(vLocalPos);
  float n = noise(vec3(dir.x, dir.y, dir.z) * 0.3 + uTime * 0.08);
  float t = clamp(n * 0.5 + 0.5, 0.0, 1.0);

  vec3 color = getColourFromPalette(t);
  gl_FragColor = vec4(color, 1.0);
}
  