precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform vec3 uPlayerWorldPos;

varying float vAlpha;
varying vec3 vInstanceCenter;
varying vec3 vWorldPos;
varying float vSeed;

const float PLAYER_IMPACT_RADIUS = 1.75; // world units

// IQ cosine palette
vec3 palette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.2831853 * (c * t + d));
}

  // Same palette as player 
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 0.5);
  vec3 d = vec3(0.80, 0.90, 0.30);

void main() {
  if (vAlpha <= 0.001) discard;

  // Distance-based highlight using instance center
  float dist = distance(vInstanceCenter, uPlayerWorldPos);
  float highlight = smoothstep(PLAYER_IMPACT_RADIUS, 0.0, dist);

  // Compute noise with slight per-instance offset using seed
  vec3 bgNoisePos = (vWorldPos * 0.3 + vec3(vSeed * 0.3, 0.0, vSeed * 0.3));
  float bgNoise = noise(bgNoisePos);
  float bgInput = clamp(bgNoise * 0.5 + 0.5, 0.0, 1.0);
  vec3 bgColour = palette(bgInput, a, b, c, d);

  vec3 background = mix(vec3(1.0), bgColour, 0.1);

  if (highlight > 0.01) {
    vec3 highlightNoisePos = (vWorldPos * 0.3);
    float highlightNoise = noise(highlightNoisePos);
    float highlightInput = clamp(highlightNoise * 0.5 + 0.5, 0.0, 1.0);
    vec3 highlightColour = palette(highlightInput, a, b, c, d);
    background = mix(background, highlightColour, highlight);
  }

  gl_FragColor = vec4(background, vAlpha);
}
