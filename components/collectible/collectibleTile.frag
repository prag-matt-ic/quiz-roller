// AnswerTile fragment shader
#pragma glslify: getColourFromPalette = require(../palette.glsl)
#pragma glslify: sdBox = require(../sdBox.glsl)

precision mediump float;
precision mediump int;

uniform mediump int uPlayerPaletteIndex; // 0,1,2: selected palette
uniform mediump float uConfirmingProgress;
uniform mediump float uTileAspect; // width / height

varying mediump vec2 vUv;
varying mediump vec2 vHeightSpacePosition;

const float BORDER_FRACTION = 0.06; // fraction of full height
const float BORDER_WAVE_FREQUENCY = 3.0;
const float BORDER_WAVE_OFFSET = 0.5;

void main() {
  const float halfHeight = 0.5;
  float halfWidth = halfHeight * uTileAspect;
  float thickness = BORDER_FRACTION * uConfirmingProgress;
  vec2 innerBoundsHeightSpace = vec2(halfWidth - thickness, halfHeight - thickness);

  float distanceFromInnerEdge = sdBox(vHeightSpacePosition, innerBoundsHeightSpace);
  float antiAliasing = fwidth(distanceFromInnerEdge);

  // 1 outside inner box (border), 0 inside
  float borderMask = smoothstep(0.0, antiAliasing, distanceFromInnerEdge);

  float borderWave = sin(vUv.x * BORDER_WAVE_FREQUENCY);
  float paletteT = borderWave * BORDER_WAVE_OFFSET + BORDER_WAVE_OFFSET;
  vec3 borderColour = getColourFromPalette(uPlayerPaletteIndex, paletteT);

  gl_FragColor = vec4(borderColour * borderMask, borderMask);
}
