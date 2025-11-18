// AnswerTile fragment shader
#pragma glslify: getColourFromPalette = require(../palette.glsl)
#pragma glslify: sdBox = require(../sdBox.glsl)
#pragma glslify: paintCorners = require(../infoZone/paintCorners.glsl)

precision mediump float;
precision mediump int;

uniform mediump int uPlayerPaletteIndex; // 0,1,2: selected palette
uniform mediump float uConfirmingProgress;
uniform mediump float uTileAspect; // width / height
uniform mediump float uTilesX;
uniform mediump float uTilesY;

varying mediump vec2 vUv;
varying mediump vec2 vHeightSpacePosition;

const float BORDER_FRACTION = 0.06; // fraction of full height
const float BORDER_WAVE_FREQUENCY = 3.0;
const float BORDER_WAVE_OFFSET = 0.5;
const float CORNER_BORDER_TILES = 0.12;
const float CORNER_LENGTH_TILES = 0.45;

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

  vec2 tileCounts = vec2(uTilesX, uTilesY);
  float cornerMask = paintCorners(
    vHeightSpacePosition,
    uTileAspect,
    tileCounts,
    CORNER_BORDER_TILES,
    CORNER_LENGTH_TILES
  );
  vec3 cornerColour = vec3(1.0);

  vec3 baseBorder = borderColour * borderMask;
  vec3 finalColour = mix(baseBorder, cornerColour, cornerMask);
  float finalAlpha = max(borderMask, cornerMask);

  gl_FragColor = vec4(finalColour, finalAlpha);
}
