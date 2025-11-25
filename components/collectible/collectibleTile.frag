// AnswerTile fragment shader
precision mediump float;
precision mediump int;

#pragma glslify: paintCorners = require(../../resources/glsl/paintCorners.glsl)

uniform mediump float uConfirmingProgress;
uniform mediump float uIsConfirming;
uniform mediump float uWasConfirmed;
uniform mediump float uAspect; // width / height
uniform mediump float uTilesX;
uniform mediump float uTilesY;

varying mediump vec2 vUv;
varying mediump vec2 vHeightSpacePosition;

const float BORDER_THICKNESS_TILES = 0.1; // thickness relative to a tile height
const float CORNER_LENGTH_TILES = 0.5; // fraction of tile to extend from each corner

void main() {
  float progress = clamp(uConfirmingProgress, 0.0, 1.0);
  
  // Start at original size, expand to 6x during confirmation (reaches neighboring corners)
  // When confirmed, lock at full extension
  bool shouldBeExtended = uIsConfirming > 0.5 || uWasConfirmed > 0.5;
  float targetLength = shouldBeExtended ? CORNER_LENGTH_TILES * 6.0 : CORNER_LENGTH_TILES;
  float animatedCornerLength = mix(CORNER_LENGTH_TILES, targetLength, progress);

  float bracketMask = paintCorners(
    vHeightSpacePosition,
    uAspect,
    vec2(uTilesX, uTilesY),
    BORDER_THICKNESS_TILES,
    animatedCornerLength
  );

  vec3 cornerColour = vec3(1.0);
  float finalAlpha = bracketMask;

  gl_FragColor = vec4(cornerColour, finalAlpha);
}
