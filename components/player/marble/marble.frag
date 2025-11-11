// Marble fragment shader without volumetric raymarching
precision mediump float;
precision mediump int;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../../palette.glsl)

uniform highp float uTime;
uniform mediump int uPaletteIndex; // 0,1,2: selected palette
uniform mediump int uConfirmingPaletteIndex; // -1 when not confirming
uniform mediump float uConfirmingProgress; // [0,1]
uniform sampler2D uNormalMap;
uniform mediump float uNormalScale;
uniform bool uIsFlat;

varying highp vec3 vLocalPos;
varying mediump vec3 vNormal;
varying mediump vec2 vUv;
varying highp vec3 vViewPosition;

// -------- Surface lighting constants --------
const vec3 LIGHT_DIR = normalize(vec3(1.0, 1.0, 1.0));
const float AMBIENT_STRENGTH = 0.8;
const float DIFFUSE_STRENGTH = 0.5;
const float SPECULAR_STRENGTH = 0.4;

// -------- Surface constants --------
const float NOISE_FREQUENCY = 0.2;
const float REVEAL_SMOOTHNESS = 0.12;

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
  highp vec3 unitLocalPos = normalize(vLocalPos);
  float noiseValue = noise(unitLocalPos * NOISE_FREQUENCY + uTime * 0.06);
  noiseValue = noiseValue * 0.5 + 0.5;

  float paletteT = clamp(noiseValue, 0.0, 1.0);
  vec3 baseColor = getColourFromPalette(uPaletteIndex, paletteT);
  vec3 marbleColor = baseColor;

  if (uConfirmingPaletteIndex >= 0 && uConfirmingProgress > 0.0) {
    vec3 confirmingColor = getColourFromPalette(uConfirmingPaletteIndex, paletteT);

    float clampedProgress = clamp(uConfirmingProgress, 0.0, 1.0);
    float height01 = unitLocalPos.y * 0.5 + 0.5;
    vec2 revealEdges = clamp(vec2(height01 - REVEAL_SMOOTHNESS, height01 + REVEAL_SMOOTHNESS), 0.0, 1.0);
    float reveal = smoothstep(revealEdges.x, revealEdges.y, clampedProgress);

    marbleColor = mix(baseColor, confirmingColor, reveal);
  }

  if (uIsFlat) {
    gl_FragColor = vec4(marbleColor, 1.0);
    return;
  }

  // Surface lighting with normal map
  vec3 normal = perturbNormal();
  vec3 viewDir = normalize(vViewPosition);
  float diffuse = max(dot(normal, LIGHT_DIR), 0.0);
  vec3 halfDir = normalize(LIGHT_DIR + viewDir);
  float specularBase = max(dot(normal, halfDir), 0.0);
  float specular2 = specularBase * specularBase;
  float specular4 = specular2 * specular2;
  float specular8 = specular4 * specular4;
  float specular = specular8 * specular2; // specularBase^10
  vec3 litSurface = marbleColor * (AMBIENT_STRENGTH + diffuse * DIFFUSE_STRENGTH) + specular * SPECULAR_STRENGTH;

  gl_FragColor = vec4(litSurface, 1.0);
}
