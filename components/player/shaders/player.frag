precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;

varying vec3 vLocalPos;
varying vec3 vNormal;

// cosine based palette, 4 vec3 params
vec3 palette( in float t, in vec3 a, in vec3 b, in vec3 c, in vec3 d ){
    return a + b * cos(6.283185 * (c * t + d));
}

void main() {
  // Generate seamless 3D noise in object space, normalize to [0,1]
  vec3 dir = normalize(vLocalPos);
  float n = noise(vec3(dir.x, dir.y, dir.z) * 0.35 + uTime * 0.08);
  float t = clamp(n * 0.5 + 0.5, 0.0, 1.0);

  // IQ cosine palette parameters (a, b, c, d)
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 0.5);
  vec3 d = vec3(0.80, 0.90, 0.30);

  vec3 color = palette(t, a, b, c, d);
  gl_FragColor = vec4(color, 1.0);
}
