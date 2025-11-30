precision mediump float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')

#pragma glslify: sampleTilesPalette = require(../../../resources/glsl/tilesPalette.glsl)

uniform lowp float uAddDetailNoise;
uniform highp float uScrollZ;
uniform sampler2D uDetailNoiseMap;
uniform highp vec2 uPlayerWorldPos;

varying mediump float vAlpha;
varying highp vec3 vWorldPos;
varying mediump vec3 vWorldNormal;
varying mediump float vSeed;
varying mediump float vPlayerHighlight;
varying mediump float vIsHighlighted;
varying mediump vec2 vUv;

// Constants
const float HIGHLIGHTED_MIX_MIN = 0.16;
const float HIGHLIGHTED_MIX_MAX = 0.32;

const float REGULAR_MIX = 0.6;
const float DARKEN_FACTOR = 0.4;
const float UP_THRESHOLD = 0.5;
const float PLAYER_PROXIMITY_MIX = 0.88;
const vec3 WHITE = vec3(1.0);
const float SHADOW_RADIUS = 0.75;
const float SHADOW_STRENGTH = 0.5;

void main() {
  // Early discard for fully transparent tiles
  if (vAlpha <= 0.001) discard;

  // Determine if this instance is an answer tile (branch-free)
  mediump float isHighlighted = step(0.5, vIsHighlighted);
  mediump float alpha = vAlpha;

  // Compute background color with scrolling noise
  highp vec3 bgNoisePos = vWorldPos * 0.06;
  bgNoisePos.xy += vSeed * vec2(0.12, -0.12);
  bgNoisePos.z -= uScrollZ * 0.06;
  float bgNoise = noise(bgNoisePos);
  float bgInput = bgNoise * 0.5 + 0.5; // Map from [-1,1] to [0,1]
  vec3 bgColour = sampleTilesPalette(bgInput);

  // Apply detail noise when quality setting is not low.
  if (uAddDetailNoise > 0.5) {
    mediump float detailNoise = texture2D(uDetailNoiseMap, vUv).r;
    bgColour -= detailNoise * 0.24;
  }

  // Mix with white based on tile type
  mediump float highlightedMix = mix(HIGHLIGHTED_MIX_MIN, HIGHLIGHTED_MIX_MAX, vSeed);
  mediump float mixAmount = mix(REGULAR_MIX, highlightedMix, isHighlighted);
  vec3 background = mix(WHITE, bgColour, mixAmount);

  // Apply player proximity highlight without losing highlighted mix
  mediump float proximityAmount = vPlayerHighlight;
  mediump float proximityMixAmount = mix(PLAYER_PROXIMITY_MIX, mixAmount, isHighlighted);
  vec3 proximityColour = mix(WHITE, bgColour, proximityMixAmount);
  background = mix(background, proximityColour, proximityAmount);

  // Apply player contact shadow
  float distToPlayer = distance(vWorldPos.xz, uPlayerWorldPos);
  float shadow = 1.0 - smoothstep(0.0, SHADOW_RADIUS, distToPlayer);
  background = mix(background, background * (1.0 - SHADOW_STRENGTH), shadow);

  // Darken non-upward-facing surfaces
  // vWorldNormal should already be normalized from vertex shader
  mediump float upDot = dot(vWorldNormal, vec3(0.0, 1.0, 0.0));
  mediump float isFacingUp = step(UP_THRESHOLD, upDot);
  mediump float shade = mix(DARKEN_FACTOR, 1.0, isFacingUp);
  background *= shade;

  // Output final color
  gl_FragColor = vec4(background, alpha);
}
