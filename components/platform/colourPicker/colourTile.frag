precision mediump float;
precision lowp int;

#pragma glslify: getColourFromPalette = require('../../../resources/glsl/playerPalette.glsl')
#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;
uniform lowp int uPaletteIndex;
uniform lowp float uIsActive;
uniform lowp float uUseNoise;

varying mediump vec2 vUv;

const float BORDER_THICKNESS = 0.04;
const float INNER_EDGE = 0.5 - BORDER_THICKNESS;
const float NOISE_SCALE = 0.8;
const float WARP_SCALE = 0.4;
const float WARP_INTENSITY = 0.22;
const float INACTIVE_SPEED = 0.1;
const float ACTIVE_SPEED = 0.5;

void main() {
  vec2 centeredUv = vUv - 0.5;
  float edge = max(abs(centeredUv.x), abs(centeredUv.y));
  float aa = fwidth(edge);

  float activeMix = clamp(uIsActive, 0.0, 1.0);
  float normalizedNoise = 0.5;

  if (uUseNoise > 0.5) {
    float flowSpeed = mix(INACTIVE_SPEED, ACTIVE_SPEED, activeMix);
    float warpedTime = uTime * flowSpeed;

    // Subtle domain-warped noise for a marble-like swirl
    vec2 warpOffset = vec2(
      noise(vec3(vUv * WARP_SCALE, warpedTime)),
      noise(vec3(vUv * WARP_SCALE + 8.0, warpedTime))
    );
    warpOffset = (warpOffset * 2.0 - 1.0) * WARP_INTENSITY;

    float noiseSample = noise(vec3((vUv + warpOffset) * NOISE_SCALE, warpedTime));
    normalizedNoise = noiseSample * 0.5 + 0.5;
  }

  // Colour from palette
  float paletteT = clamp(normalizedNoise, 0.0, 1.0);
  lowp vec3 baseColour = getColourFromPalette(uPaletteIndex, paletteT); // Use lowp for color

  lowp vec3 finalColour = baseColour;

  // Border
  float borderMask = smoothstep(INNER_EDGE - aa, INNER_EDGE + aa, edge);

  lowp vec3 borderColour = mix(vec3(0.0), vec3(1.0), activeMix);
  finalColour = mix(finalColour, borderColour, borderMask);

  gl_FragColor = vec4(finalColour, 1.0);
}
