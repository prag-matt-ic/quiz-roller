precision mediump float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')

#pragma glslify: sampleTilesPalette = require(../../../resources/glsl/tilesPalette.glsl)

uniform lowp float uAddDetailNoise;
uniform highp float uScrollZ;
uniform sampler2D uDetailNoiseMap1;
uniform sampler2D uDetailNoiseMap2;
uniform sampler2D uDetailNoiseMap3;
uniform highp vec3 uPlayerWorldPos;
uniform lowp float uShadowEnabled;

varying mediump float vAlpha;
varying highp vec3 vWorldPos;
varying mediump float vSeed;
varying mediump float vPlayerHighlight;
varying mediump float vIsHighlighted;
varying mediump vec2 vUv;
varying lowp float vShade;
varying lowp float vDetailIndex;

// Constants
const float HIGHLIGHTED_MIX_MIN = 0.16;
const float HIGHLIGHTED_MIX_MAX = 0.32;

const float REGULAR_MIX = 0.55;
const float PLAYER_PROXIMITY_MIX = 0.88;
const vec3 WHITE = vec3(1.0);

const float SHADOW_RADIUS = 0.75;
const float SHADOW_RADIUS_MAX_SCALE = 1.5;
const float SHADOW_RADIUS_MIN_SCALE = 1.0;
const float SHADOW_STRENGTH = 0.8;
const float SHADOW_FADE_START_Y = 1.5; // fully hidden
const float SHADOW_FADE_END_Y = 0.5; // fully visible
const float SHADOW_FADE_RANGE_INV = 1.0 / (SHADOW_FADE_START_Y - SHADOW_FADE_END_Y);
const float SHADOW_MIN_PLAYER_Y = -0.5; // no shadow if player below this

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
    mediump float detailIndex = vDetailIndex;
    mediump float detailNoise = 0.0;
    if (detailIndex < 0.5) {
      detailNoise = texture2D(uDetailNoiseMap1, vUv).r;
    } else if (detailIndex < 1.5) {
      detailNoise = texture2D(uDetailNoiseMap2, vUv).r;
    } else {
      detailNoise = texture2D(uDetailNoiseMap3, vUv).r;
    }
    bgColour -= detailNoise * 0.12;
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
  float distToPlayer = distance(vWorldPos.xz, uPlayerWorldPos.xz);
  float shadowHeightT = clamp(
    (SHADOW_FADE_START_Y - uPlayerWorldPos.y) * SHADOW_FADE_RANGE_INV,
    0.0,
    1.0
  );
  float playerAboveGround = step(SHADOW_MIN_PLAYER_Y, uPlayerWorldPos.y);
  float shadowHeightFade = shadowHeightT * shadowHeightT * (3.0 - 2.0 * shadowHeightT);
  shadowHeightFade *= playerAboveGround;
  float shadowRadiusScale = mix(SHADOW_RADIUS_MAX_SCALE, SHADOW_RADIUS_MIN_SCALE, shadowHeightFade);
  float shadowRadius = SHADOW_RADIUS * shadowRadiusScale;
  float shadow = 1.0 - smoothstep(0.0, shadowRadius, distToPlayer);
  shadow = shadow * shadow * sqrt(shadow);
  shadow *= shadowHeightFade * uShadowEnabled;
  background *= 1.0 - shadow * SHADOW_STRENGTH;

  // Darken non-upward-facing surfaces
  background *= vShade;

  // Output final color
  gl_FragColor = vec4(background, alpha);
}
