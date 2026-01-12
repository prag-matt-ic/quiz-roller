// Marble fragment shader without volumetric raymarching
precision mediump float;
precision mediump int;

#pragma glslify: noise = require('glsl-noise/simplex/3d')

#pragma glslify: samplePlayerPalette = require(../../../resources/glsl/playerPalette.glsl).samplePlayerPalette
#pragma glslify: getColourFromPalette = require(../../../resources/glsl/playerPalette.glsl).getColourFromPalette

uniform highp float uTime;
uniform mediump float uConfirmingProgress; // [0,1]
uniform bool uIsFlat;
uniform bool uEnableVeins;
uniform mediump int uPaletteIndex; // 0,1,2: selected palette
uniform mediump int uConfirmingPaletteIndex; // -1 when not confirming
uniform mediump float uSpeed;
uniform mediump vec2 uPaletteRange; // [min, max] range for palette sampling
uniform mediump vec3 uTint; // Color tint multiplier

varying highp vec3 vLocalPos;
varying mediump vec3 vNormal;
varying mediump vec2 vUv;
varying highp vec3 vViewPosition;
varying mediump float vRespawnFade;
varying mediump float vDistanceFade;

// -------- Surface lighting constants --------
const vec3 LIGHT_DIR = normalize(vec3(1.0, 1.0, 1.0));
const float AMBIENT_STRENGTH = 0.8;
const float DIFFUSE_STRENGTH = 0.5;
const float SPECULAR_STRENGTH = 0.4;

// -------- Surface constants --------
const float NOISE_FREQUENCY = 0.2;
const float REVEAL_SMOOTHNESS = 0.12;

// -------- Mineral vein constants --------
const float VEIN_NOISE_FREQUENCY = 0.7;
const float VEIN_ANIMATION_SPEED = 0.06;
const float VEIN_POWER = 2.5;
const float VEIN_INTENSITY = 0.25;
const float VEIN_BRIGHTEN_STRENGTH = 0.5;
const float SPEED_DARKEN_MAX = 0.1;
const float SPEED_VEIN_INTENSITY_BOOST = 0.35;
const float SPEED_VEIN_BRIGHTEN_BOOST = 0.25;

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

void main() {
  // Base palette color via 3D noise in object space
  highp vec3 unitLocalPos = normalize(vLocalPos);
  float animatedTime = uTime * VEIN_ANIMATION_SPEED;
  float noiseValue = noise(unitLocalPos * NOISE_FREQUENCY + animatedTime);
  noiseValue = noiseValue * 0.5 + 0.5;

  float paletteT = clamp(noiseValue, 0.0, 1.0);
  // Remap paletteT to the specified range for player distinction
  float remappedT = mix(uPaletteRange.x, uPaletteRange.y, paletteT);
  vec3 baseColor = samplePlayerPalette(remappedT, uPaletteIndex) * uTint;
  vec3 marbleColor = applyConfirmingReveal(baseColor, paletteT, unitLocalPos);

  if (uIsFlat) {
    gl_FragColor = vec4(marbleColor, vRespawnFade * vDistanceFade);
    return;
  }

  if (uEnableVeins) {
    float speedAmount = clamp(uSpeed, 0.0, 1.0);
    // float speedEase = speedAmount * speedAmount; // softer response at low speed
    float darken = SPEED_DARKEN_MAX * speedAmount;
    marbleColor *= (1.0 - darken);

    // High-frequency ridges for mineral veins
    float veinNoise = noise(unitLocalPos * VEIN_NOISE_FREQUENCY + animatedTime);
    float veinMask = pow(clamp(1.0 - abs(veinNoise), 0.0, 1.0), VEIN_POWER);
    float veinBrighten = VEIN_BRIGHTEN_STRENGTH + SPEED_VEIN_BRIGHTEN_BOOST * speedAmount;
    float veinIntensity = VEIN_INTENSITY + SPEED_VEIN_INTENSITY_BOOST * speedAmount;
    vec3 veinColour = mix(marbleColor, vec3(1.0), veinBrighten);
    marbleColor += veinColour * veinMask * veinIntensity;
  }

  // Surface lighting
  vec3 normal = normalize(vNormal);
  vec3 viewDir = normalize(vViewPosition);
  float diffuse = max(dot(normal, LIGHT_DIR), 0.0);
  vec3 halfDir = normalize(LIGHT_DIR + viewDir);
  float specularBase = max(dot(normal, halfDir), 0.0);
  float specular2 = specularBase * specularBase;
  float specular4 = specular2 * specular2;
  float specular8 = specular4 * specular4;
  float specular = specular8 * specular2; // specularBase^10
  vec3 litSurface = marbleColor * (AMBIENT_STRENGTH + diffuse * DIFFUSE_STRENGTH) + specular * SPECULAR_STRENGTH;

  gl_FragColor = vec4(litSurface, vRespawnFade * vDistanceFade);
}
