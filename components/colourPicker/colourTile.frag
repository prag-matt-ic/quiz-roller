precision mediump float; // Lowered for general math

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require('../palette.glsl')
#pragma glslify: paletteRange = require('../paletteRange.glsl')

uniform float uTime;
uniform lowp int uColourIndex;
uniform lowp float uIsActive;

varying vec2 vUv;

const float NOISE_SCALE = 1.4;
const float ACTIVE_NOISE_TIME_SPEED = 0.8;
const float INACTIVE_NOISE_TIME_SPEED = 0.12;
const float BORDER_THICKNESS = 0.04;

float sdCircle(in vec2 p, in float r) {
  return length(p) - r;
}

void main() {
  vec2 centeredUv = vUv - 0.5;
  const float OUTER_RADIUS = 0.5;
  float radialLength = length(centeredUv);
  float radial = radialLength / OUTER_RADIUS;

  float outerDistance = radialLength - OUTER_RADIUS;
  if (outerDistance > 0.0) {
    discard;
  }

  float activeMix = clamp(uIsActive, 0.0, 1.0);
  float timeSpeed = mix(INACTIVE_NOISE_TIME_SPEED, ACTIVE_NOISE_TIME_SPEED, activeMix);

  float primaryNoise = noise(vec3(vUv * NOISE_SCALE, uTime * timeSpeed));
  float detailNoise = noise(
    vec3(centeredUv * (NOISE_SCALE * 320.0), uTime)
  );
  float noiseValue = mix(primaryNoise, detailNoise, 0.25) * 0.5 + 0.5;

  // Colour from palette
  float minValue;
  float maxValue;
  paletteRange(uColourIndex, minValue, maxValue);
  
  float paletteT = mix(minValue, maxValue, noiseValue);
  lowp vec3 baseColour = getColourFromPalette(paletteT); // Use lowp for color

  // Vignette shading
  float edgeVignette = smoothstep(0.35, 1.0, radial);
  lowp vec3 shadedColour = mix(baseColour, vec3(0.0), edgeVignette * 0.3);
  lowp vec3 finalColour = shadedColour;

  // Border
  float innerRadius = max(OUTER_RADIUS - BORDER_THICKNESS, 0.0);
  float innerDistance = radialLength - innerRadius; // Hoisted sdCircle
  float innerAntiAliasing = fwidth(innerDistance);
  float borderMask = smoothstep(innerRadius, innerRadius + innerAntiAliasing, radialLength);

  finalColour = mix(finalColour, vec3(1.0), borderMask * activeMix);

  gl_FragColor = vec4(finalColour, 1.0);
}
