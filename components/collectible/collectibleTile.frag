// AnswerTile fragment shader
precision mediump float;
precision mediump int;

#pragma glslify: paintCorners = require(../../resources/glsl/paintCorners.glsl)
#pragma glslify: samplePlayerPalette = require(../../resources/glsl/playerPalette.glsl)
#pragma glslify: sdBox = require(../../resources/glsl/sdBox.glsl)

uniform mediump float uConfirmingProgress;
uniform mediump float uAspect; // width / height
uniform mediump float uTilesX;
uniform mediump float uTilesY;

varying mediump vec2 vUv;
varying mediump vec2 vHeightSpacePosition;

const float BORDER_FRACTION = 0.1; // fraction of full height
const float BORDER_WAVE_FREQUENCY = 3.0;
const float BORDER_WAVE_OFFSET = 0.5;

const float BORDER_THICKNESS_TILES = 0.1; // thickness relative to a tile height
const float CORNER_LENGTH_TILES = 0.5; // fraction of tile to extend from each corner

void main() {
  const float halfHeight = 0.5;
  float halfWidth = halfHeight * uAspect;
  float thickness = BORDER_FRACTION * uConfirmingProgress;
  vec2 innerBoundsHeightSpace = vec2(halfWidth - thickness, halfHeight - thickness);

  float distanceFromInnerEdge = sdBox(vHeightSpacePosition, innerBoundsHeightSpace);
  float antiAliasing = fwidth(distanceFromInnerEdge);

  // 1 outside inner box (border), 0 inside
  float borderMask = smoothstep(0.0, antiAliasing, distanceFromInnerEdge);

  float borderWave = sin(vUv.x * BORDER_WAVE_FREQUENCY);
  float paletteT = borderWave * BORDER_WAVE_OFFSET + BORDER_WAVE_OFFSET;
  vec3 borderColour = samplePlayerPalette(paletteT);

  float bracketMask = paintCorners(
    vHeightSpacePosition,
    uAspect,
    vec2(uTilesX, uTilesY),
    BORDER_THICKNESS_TILES,
    CORNER_LENGTH_TILES
  );

  vec3 cornerColour = vec3(1.0);

  vec3 baseBorder = borderColour * borderMask;
  vec3 finalColour = mix(baseBorder, cornerColour, bracketMask);
  float finalAlpha = max(borderMask, bracketMask);

  gl_FragColor = vec4(finalColour, finalAlpha);
}
