// AnswerTile fragment shader
#pragma glslify: getColourFromPalette = require(../palette.glsl)
#pragma glslify: paletteRange = require(../paletteRange.glsl)

precision mediump float;
precision mediump int;

uniform mediump int uPlayerColourIndex; // 0,1,2: selected palette band
uniform mediump float uConfirmingProgress;
uniform mediump float uTileAspect; // width / height
uniform sampler2D uTextTexture;

varying mediump vec2 vUv;
varying mediump vec2 vHeightSpacePosition;

const float BORDER_FRACTION = 0.06; // fraction of full height
const float BORDER_WAVE_FREQUENCY = 3.0;
const float BORDER_WAVE_OFFSET = 0.5;

float sdBox(in vec2 position, in vec2 bounds) {
    vec2 distance = abs(position) - bounds;
    return length(max(distance, 0.0)) + min(max(distance.x, distance.y), 0.0);
}

void main() {
  // Always render the inner area; border reacts to uConfirmingProgress

  // Plane bounds half-size in height-space
  vec2 outerBoundsHeightSpace = vec2(0.5 * uTileAspect, 0.5);
  float thickness = BORDER_FRACTION * uConfirmingProgress;
  vec2 innerBoundsHeightSpace = outerBoundsHeightSpace - thickness;

  float distanceFromInnerEdge = sdBox(vHeightSpacePosition, innerBoundsHeightSpace);
  float antiAliasing = fwidth(distanceFromInnerEdge);

  // 1 outside inner box (border), 0 inside
  float borderMask = smoothstep(0.0, antiAliasing, distanceFromInnerEdge);

  float borderColourPosition = sin(vUv.x * BORDER_WAVE_FREQUENCY) * BORDER_WAVE_OFFSET + BORDER_WAVE_OFFSET;
  float minValue, maxValue;
  paletteRange(uPlayerColourIndex, minValue, maxValue);
  float paletteT = mix(minValue, maxValue, borderColourPosition);
  vec3 borderColour = getColourFromPalette(paletteT);
  vec4 color = vec4(borderColour, 1.0) * borderMask;

  // Sample the text texture and overlay it inside the inner area only
  float innerMask = 1.0 - borderMask;
  vec4 textSample = texture2D(uTextTexture, vUv);
  float textMixWeight = textSample.a * innerMask;
  // Composite: keep border opaque, overlay text only where inner
  color = mix(color, textSample, textMixWeight);

  gl_FragColor = color;
}
