precision mediump float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: noise2d = require('glsl-noise/simplex/2d')

#pragma glslify: sampleTilesPalette = require(../../../resources/glsl/tilesPalette.glsl)

uniform lowp float uAddDetailNoise;
uniform highp float uScrollZ;

varying mediump float vAlpha;
varying highp vec3 vWorldPos;
varying mediump vec3 vWorldNormal;
varying mediump float vSeed;
varying mediump float vPlayerHighlight;
varying mediump float vIsHighlighted;
varying mediump vec2 vUv;

// Constants
const float HIGHLIGHTED_MIX_MIN = 0.12;
const float HIGHLIGHTED_MIX_MAX = 0.24;

const float REGULAR_MIX = 0.5;
const float DARKEN_FACTOR = 0.4;
const float UP_THRESHOLD = 0.5;
const float HIGHLIGHT_MIX = 0.85;
const vec3 WHITE = vec3(1.0);

void main() {
  // Early discard for fully transparent tiles
  if (vAlpha <= 0.001) discard;

  // Determine if this instance is an answer tile (branch-free)
  mediump float isHighlighted = step(0.5, vIsHighlighted);
  mediump float alpha = vAlpha;

  // Compute background color with scrolling noise
  highp vec3 bgNoisePos = vWorldPos * 0.06;
  bgNoisePos.xy += vSeed * vec2(0.12, -0.12);
  bgNoisePos.z -= uScrollZ * 0.1;
  float bgNoise = noise(bgNoisePos);
  float bgInput = bgNoise * 0.5 + 0.5; // Map from [-1,1] to [0,1]
  vec3 bgColour = sampleTilesPalette(bgInput);

  // Apply detail noise when quality setting is high.
  if (uAddDetailNoise > 0.5) {
    mediump float detailNoise = noise2d(vUv * 48.0) * 0.5 + 0.5;
    bgColour -= detailNoise * 0.2;
  }

  // Mix with white based on tile type
  mediump float highlightedMix = mix(HIGHLIGHTED_MIX_MIN, HIGHLIGHTED_MIX_MAX, vSeed);
  mediump float mixAmount = mix(REGULAR_MIX, highlightedMix, isHighlighted);
  vec3 background = mix(WHITE, bgColour, mixAmount);

  // Apply player proximity highlight without losing highlighted mix
  mediump float proximityAmount = vPlayerHighlight;
  mediump float proximityMixAmount = mix(HIGHLIGHT_MIX, mixAmount, isHighlighted);
  vec3 proximityColour = mix(WHITE, bgColour, proximityMixAmount);
  background = mix(background, proximityColour, proximityAmount);

  // Darken non-upward-facing surfaces
  // vWorldNormal should already be normalized from vertex shader
  mediump float upDot = dot(vWorldNormal, vec3(0.0, 1.0, 0.0));
  mediump float isFacingUp = step(UP_THRESHOLD, upDot);
  mediump float shade = mix(DARKEN_FACTOR, 1.0, isFacingUp);
  background *= shade;

  // Output final color
  gl_FragColor = vec4(background, alpha);
}
