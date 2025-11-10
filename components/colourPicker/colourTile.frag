precision mediump float;
precision lowp int;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require('../palette.glsl')
#pragma glslify: paletteRange = require('../paletteRange.glsl')

uniform float uTime;
uniform lowp int uColourIndex;
uniform lowp float uIsActive;
uniform lowp float uUseNoise;

varying mediump vec2 vUv;

const float NOISE_SCALE = 1.4;
const float DETAIL_NOISE_SCALE = NOISE_SCALE * 320.0;
const float DETAIL_NOISE_WEIGHT = 0.25;
const float ACTIVE_NOISE_TIME_SPEED = 0.8;
const float INACTIVE_NOISE_TIME_SPEED = 0.12;
const float NOISE_TIME_DELTA = ACTIVE_NOISE_TIME_SPEED - INACTIVE_NOISE_TIME_SPEED;
const float BORDER_THICKNESS = 0.05;
const float OUTER_RADIUS = 0.5;
const float INV_OUTER_RADIUS = 2.0;
const float INNER_RADIUS = OUTER_RADIUS - BORDER_THICKNESS;
const float VIGNETTE_START = 0.35;
const float VIGNETTE_INTENSITY = 0.3;

void main() {
  vec2 centeredUv = vUv - 0.5;
  float radialLength = length(centeredUv);

  if (radialLength > OUTER_RADIUS) {
    discard;
  }

  float radial = radialLength * INV_OUTER_RADIUS;
  float activeMix = clamp(uIsActive, 0.0, 1.0);
  float normalizedNoise;
  if (uUseNoise > 0.5) {
    float timeFactor = uTime * (INACTIVE_NOISE_TIME_SPEED + NOISE_TIME_DELTA * activeMix);
    vec2 scaledUv = vUv * NOISE_SCALE;
    float primaryNoise = noise(vec3(scaledUv, timeFactor));
    float detailNoise = noise(vec3(centeredUv * DETAIL_NOISE_SCALE, uTime));
    float noiseValue = primaryNoise + (detailNoise - primaryNoise) * DETAIL_NOISE_WEIGHT;
    normalizedNoise = noiseValue * 0.5 + 0.5;
  } else {
    // Flat fill: center of the palette range
    normalizedNoise = 0.5;
  }

  // Colour from palette
  float minValue;
  float maxValue;
  paletteRange(uColourIndex, minValue, maxValue);
  
  float paletteT = minValue + (maxValue - minValue) * normalizedNoise;
  lowp vec3 baseColour = getColourFromPalette(paletteT); // Use lowp for color

  // Vignette shading
  float vignetteStrength = smoothstep(VIGNETTE_START, 1.0, radial) * VIGNETTE_INTENSITY;
  lowp vec3 finalColour = baseColour * (1.0 - vignetteStrength);

  // Border
  float borderDistance = radialLength - INNER_RADIUS;
  float borderAntiAliasing = fwidth(borderDistance);
  float borderMask = smoothstep(0.0, borderAntiAliasing, borderDistance);

  finalColour = mix(finalColour, vec3(1.0), borderMask * activeMix);

  gl_FragColor = vec4(finalColour, 1.0);
}
