precision mediump float;
precision lowp int;

#pragma glslify: getColourFromPalette = require('../../../resources/glsl/playerPalette.glsl')
#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform float uTime;
uniform lowp int uPaletteIndex;
uniform lowp float uIsActive;
uniform lowp float uUseNoise;
uniform mediump float uDistanceFadeEnabled;

varying mediump vec2 vUv;
varying mediump float vDistanceFade;

const float BORDER_THICKNESS = 0.04;
const float INNER_EDGE = 0.5 - BORDER_THICKNESS;
const float NOISE_SCALE = 0.6;
const float WARP_SCALE = 0.4;
const float WARP_INTENSITY = 0.4;
const float INACTIVE_SPEED = 0.1;
const float ACTIVE_SPEED = 0.4;

void main() {
  vec2 centeredUv = vUv - 0.5;
  float edge = max(abs(centeredUv.x), abs(centeredUv.y));
  float aa = fwidth(edge);

  float activeMix = clamp(uIsActive, 0.0, 1.0);
  float normalizedNoise = 0.5;
  float paletteSeed = float(uPaletteIndex) * 4.0;

  if (uUseNoise > 0.5) {
    float warpedTime = uTime * mix(INACTIVE_SPEED, ACTIVE_SPEED, activeMix);
    vec2 warpCoord = vUv * WARP_SCALE;

    // Subtle domain-warped noise for a marble-like swirl
    vec2 warpOffset = vec2(
      noise(vec3(warpCoord, warpedTime)),
      noise(vec3(warpCoord + paletteSeed, warpedTime))
    );
    warpOffset = (warpOffset * 2.0 - 1.0) * WARP_INTENSITY;

    vec2 warpedUv = (vUv + warpOffset) * NOISE_SCALE;
    float noiseSample = noise(vec3(warpedUv, warpedTime));
    normalizedNoise = noiseSample * 0.5 + 0.5;
  }

  // Colour from palette
  float paletteT = clamp(normalizedNoise, 0.0, 1.0);
  lowp vec3 baseColour = getColourFromPalette(uPaletteIndex, paletteT); // Use lowp for color

  lowp vec3 finalColour = baseColour;

  // Border
  float borderMask = smoothstep(INNER_EDGE - aa, INNER_EDGE + aa, edge);

  lowp vec3 borderColour = vec3(1.0 - activeMix);
  finalColour = mix(finalColour, borderColour, borderMask);

  gl_FragColor = vec4(finalColour, 1.0 * mix(1.0, vDistanceFade, uDistanceFadeEnabled));
}
