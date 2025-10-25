// Marble fragment shader without volumetric raymarching
precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)
#pragma glslify: paletteRange = require(../../paletteRange.glsl)

uniform float uTime;
uniform int uPlayerColourIndex; // 0,1,2: selected palette band
uniform sampler2D uNormalMap;
uniform float uNormalScale;

varying vec3 vLocalPos;
varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vViewPosition;

// -------- Surface lighting constants --------
const vec3 LIGHT_DIR = normalize(vec3(1.0, 1.0, 1.0));
const float SPECULAR_POWER = 10.0;
const float AMBIENT_STRENGTH = 0.8;
const float DIFFUSE_STRENGTH = 0.5;
const float SPECULAR_STRENGTH = 0.4;

// -------- Surface constants --------
const float NOISE_FREQUENCY = 0.3;
const float NOISE_TO_RANGE = 0.5;
const float NOISE_RANGE_OFFSET = 0.5;

// -------- Helpers --------
// Perturb normal with normal map using tangent-space normal mapping
vec3 perturbNormal() {
  vec3 mapN = texture2D(uNormalMap, vUv).xyz * 2.0 - 1.0;
  mapN.xy *= uNormalScale;

  vec3 q0 = dFdx(vViewPosition);
  vec3 q1 = dFdy(vViewPosition);
  vec2 st0 = dFdx(vUv);
  vec2 st1 = dFdy(vUv);

  vec3 N = normalize(vNormal);
  vec3 T = normalize(q0 * st1.t - q1 * st0.t);
  vec3 B = -normalize(cross(N, T));
  mat3 TBN = mat3(T, B, N);

  return normalize(TBN * mapN);
}

void main() {
  // Base palette color via 3D noise in object space
  float noiseValue = noise(normalize(vLocalPos) * NOISE_FREQUENCY + uTime * 0.08);
  noiseValue = noiseValue * NOISE_TO_RANGE + NOISE_RANGE_OFFSET;

  float minValue, maxValue;
  paletteRange(uPlayerColourIndex, minValue, maxValue);
  float paletteT = mix(minValue, maxValue, noiseValue);
  vec3 baseColor = getColourFromPalette(paletteT);

  // Surface lighting with normal map
  vec3 normal = perturbNormal();
  vec3 viewDir = normalize(vViewPosition);
  float diffuse = max(dot(normal, LIGHT_DIR), 0.0);
  vec3 halfDir = normalize(LIGHT_DIR + viewDir);
  float specular = pow(max(dot(normal, halfDir), 0.0), SPECULAR_POWER);
  vec3 litSurface = baseColor * (AMBIENT_STRENGTH + diffuse * DIFFUSE_STRENGTH) + specular * SPECULAR_STRENGTH;

  gl_FragColor = vec4(litSurface, 1.0);
}
