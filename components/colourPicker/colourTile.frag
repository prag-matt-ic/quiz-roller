precision highp float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require('../palette.glsl')
#pragma glslify: paletteRange = require('../paletteRange.glsl')

uniform float uTime;
uniform int uColourIndex;
uniform float uIsActive;

varying vec2 vUv;

const float NOISE_SCALE = 1.4;
const float ACTIVE_NOISE_TIME_SPEED = 0.3;
const float INACTIVE_NOISE_TIME_SPEED = 0.08;
const float BORDER_THICKNESS = 0.05;

float sdCircle(in vec2 p, in float r) {
  return length(p) - r;
}

void main() {
  vec2 centeredUv = vUv - 0.5;
  const float OUTER_RADIUS = 0.5;
  float radialLength = length(centeredUv);
  float radial = radialLength / OUTER_RADIUS;

  float outerDistance = sdCircle(centeredUv, OUTER_RADIUS);
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
  vec3 baseColour = getColourFromPalette(paletteT);

  // Vignette shading
  float edgeVignette = smoothstep(0.35, 1.0, radial);
  vec3 shadedColour = mix(baseColour, vec3(0.0), edgeVignette * 0.3);

  vec3 finalColour = shadedColour;

  // Border
  float innerRadius = max(OUTER_RADIUS - BORDER_THICKNESS, 0.0);
  float innerDistance = sdCircle(centeredUv, innerRadius);
  float innerAntiAliasing = fwidth(innerDistance);
  float borderMask = smoothstep(innerRadius, innerRadius + innerAntiAliasing, radialLength);

  finalColour = mix(finalColour, vec3(1.0), borderMask * activeMix);

  gl_FragColor = vec4(finalColour, 1.0);
}
