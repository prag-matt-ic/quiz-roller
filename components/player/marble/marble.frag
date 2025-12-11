// Marble fragment shader without volumetric raymarching
precision mediump float;
precision mediump int;

#pragma glslify: noise = require('glsl-noise/simplex/3d')

#pragma glslify: samplePlayerPalette = require(../../../resources/glsl/playerPalette.glsl).samplePlayerPalette
#pragma glslify: getColourFromPalette = require(../../../resources/glsl/playerPalette.glsl).getColourFromPalette

uniform highp float uTime;
uniform mediump float uConfirmingProgress; // [0,1]
uniform sampler2D uNormalMap;
uniform mediump float uNormalScale;
uniform bool uIsFlat;
uniform bool uEnableVeins;
uniform mediump int uPaletteIndex; // 0,1,2: selected palette
uniform mediump int uConfirmingPaletteIndex; // -1 when not confirming

varying highp vec3 vLocalPos;
varying mediump vec3 vNormal;
varying mediump vec2 vUv;
varying highp vec3 vViewPosition;
varying mediump float vRespawnFade;

// -------- Surface lighting constants --------
const vec3 LIGHT_DIR = normalize(vec3(1.0, 1.0, 1.0));
const float AMBIENT_STRENGTH = 0.8;
const float DIFFUSE_STRENGTH = 0.5;
const float SPECULAR_STRENGTH = 0.4;

// -------- Surface constants --------
const float NOISE_FREQUENCY = 0.2;
const float REVEAL_SMOOTHNESS = 0.12;

// -------- Mineral vein constants --------
const float VEIN_NOISE_FREQUENCY = 0.9;
const float VEIN_ANIMATION_SPEED = 0.06;
const float VEIN_POWER = 3.5;
const float VEIN_INTENSITY = 0.2;
const float VEIN_BRIGHTEN_STRENGTH = 0.5;

vec3 applyConfirmingReveal(vec3 baseColor, float paletteT, highp vec3 unitLocalPos) {
  if (uConfirmingPaletteIndex < 0 || uConfirmingProgress <= 0.0) {
    return baseColor;
  }

  vec3 confirmingColor = getColourFromPalette(uConfirmingPaletteIndex, paletteT);
  float clampedProgress = clamp(uConfirmingProgress, 0.0, 1.0);
  float height01 = unitLocalPos.y * 0.5 + 0.5;
  float revealSmoothness = REVEAL_SMOOTHNESS * 1.35; // soften blend band
  vec2 revealEdges = clamp(vec2(height01 - revealSmoothness, height01 + revealSmoothness), 0.0, 1.0);
  float reveal = smoothstep(revealEdges.x, revealEdges.y, clampedProgress);

  return mix(baseColor, confirmingColor, reveal);
}

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
  float animatedTime = uTime * VEIN_ANIMATION_SPEED;
  float noiseValue = noise(unitLocalPos * NOISE_FREQUENCY + animatedTime);
  noiseValue = noiseValue * 0.5 + 0.5;

  float paletteT = clamp(noiseValue, 0.0, 1.0);
  vec3 baseColor = samplePlayerPalette(paletteT, uPaletteIndex);
  vec3 marbleColor = applyConfirmingReveal(baseColor, paletteT, unitLocalPos);

  if (uIsFlat) {
    gl_FragColor = vec4(marbleColor, vRespawnFade);
    return;
  }

  if (uEnableVeins) {
    // High-frequency ridges for mineral veins
    float veinNoise = noise(unitLocalPos * VEIN_NOISE_FREQUENCY + animatedTime);
    float veinMask = pow(clamp(1.0 - abs(veinNoise), 0.0, 1.0), VEIN_POWER);
    vec3 veinColour = mix(marbleColor, vec3(1.0), VEIN_BRIGHTEN_STRENGTH);
    marbleColor += veinColour * veinMask * VEIN_INTENSITY;
  }

  // Surface lighting with normal map
  vec3 normal = normalize(vNormal); // perturbNormal();
  vec3 viewDir = normalize(vViewPosition);
  float diffuse = max(dot(normal, LIGHT_DIR), 0.0);
  vec3 halfDir = normalize(LIGHT_DIR + viewDir);
  float specularBase = max(dot(normal, halfDir), 0.0);
  float specular2 = specularBase * specularBase;
  float specular4 = specular2 * specular2;
  float specular8 = specular4 * specular4;
  float specular = specular8 * specular2; // specularBase^10
  vec3 litSurface = marbleColor * (AMBIENT_STRENGTH + diffuse * DIFFUSE_STRENGTH) + specular * SPECULAR_STRENGTH;

  gl_FragColor = vec4(litSurface, vRespawnFade);
}
