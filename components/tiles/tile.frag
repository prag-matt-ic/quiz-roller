precision mediump float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')
#pragma glslify: getColourFromPalette = require(../palette.glsl)

uniform highp float uScrollZ;

varying mediump float vAlpha;
varying highp vec3 vWorldPos;
varying mediump vec3 vWorldNormal;
varying mediump float vSeed;
varying mediump float vPlayerHighlight;
varying mediump float vAnswerNumber;
varying mediump float vFadeOut;

// Constants
const float ANSWER_MIX = 0.1;
const float NON_ANSWER_MIX = 0.25;
const float DARKEN_FACTOR = 0.7;
const float UP_THRESHOLD = 0.5;
const float HIGHLIGHT_MIX = 0.95;

void main() {
  // Early discard for fully transparent tiles
  if (vAlpha <= 0.001 || vFadeOut <= 0.001) discard;

  // Determine if this instance is an answer tile (branch-free)
  mediump float hasAnswer = step(0.5, vAnswerNumber);
  mediump float alpha = vAlpha;

  // Compute background color with scrolling noise
  highp vec3 bgNoisePos = vWorldPos * 0.1;
  bgNoisePos.xy += vSeed * vec2(0.12, -0.12);
  bgNoisePos.z -= uScrollZ * 0.1;
  float bgNoise = noise(bgNoisePos);
  float bgInput = bgNoise * 0.5 + 0.5; // Map from [-1,1] to [0,1]
  vec3 bgColour = getColourFromPalette(bgInput);

  // Mix with white based on tile type
  mediump float mixAmount = mix(NON_ANSWER_MIX, ANSWER_MIX, hasAnswer);
  vec3 background = mix(vec3(1.0), bgColour, mixAmount);

  // Apply player proximity highlight
  mediump float highlightAmount = clamp(vPlayerHighlight, 0.0, 1.0);
  vec3 highlightColour = mix(vec3(1.0), bgColour, HIGHLIGHT_MIX);
  background = mix(background, highlightColour, highlightAmount);

  // Darken non-upward-facing surfaces
  // vWorldNormal should already be normalized from vertex shader
  mediump float upDot = dot(vWorldNormal, vec3(0.0, 1.0, 0.0));
  mediump float isFacingUp = step(UP_THRESHOLD, upDot);
  mediump float shade = mix(DARKEN_FACTOR, 1.0, isFacingUp);
  background *= shade;

  // Apply final fade-out
  gl_FragColor = vec4(background, alpha * vFadeOut);
}
