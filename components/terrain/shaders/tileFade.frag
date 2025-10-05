precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform vec3 uPlayerWorldPos;

varying float vAlpha;
varying vec3 vInstanceCenter;
varying vec3 vWorldPos;

const float PLAYER_IMPACT_RADIUS = 1.75; // world units

// IQ cosine palette
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.2831853 * (c * t + d));
}

void main() {
  float alpha = clamp(vAlpha, 0.0, 1.0);
  if (alpha <= 0.001) discard;

  // Distance-based highlight using instance center
  float dist = distance(vInstanceCenter, uPlayerWorldPos);
  float highlight = smoothstep(PLAYER_IMPACT_RADIUS, 0.0, dist);

  // Compute noise
  float n = noise(vWorldPos * 0.2);
  float t = clamp(n * 0.5 + 0.5, 0.0, 1.0);

  // Same palette as player
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 0.5);
  vec3 d = vec3(0.80, 0.90, 0.30);

  vec3 pal = palette(t, a, b, c, d);

  vec3 background = mix(vec3(1.0), pal, 0.16);

 vec3 color = mix(background, pal, highlight * 0.8);

  gl_FragColor = vec4(color, alpha);
}
