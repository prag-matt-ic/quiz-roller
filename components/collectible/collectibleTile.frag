// AnswerTile fragment shader
precision mediump float;
precision mediump int;

#pragma glslify: paintCorners = require(../../resources/glsl/paintCorners.glsl)
#pragma glslify: samplePlayerPalette = require(../../resources/glsl/playerPalette.glsl)

uniform mediump float uConfirmingProgress;
uniform mediump float uAspect; // width / height
uniform mediump float uTilesX;
uniform mediump float uTilesY;

varying mediump vec2 vUv;
varying mediump vec2 vHeightSpacePosition;

const float BORDER_FRACTION = 0.05; // fraction of full height
const float BORDER_WAVE_FREQUENCY = 2.0;
const float BORDER_WAVE_OFFSET = 0.5;

const float BORDER_THICKNESS_TILES = 0.1; // thickness relative to a tile height
const float CORNER_LENGTH_TILES = 0.5; // fraction of tile to extend from each corner

void main() {
  float progress = clamp(uConfirmingProgress, 0.0, 1.0);
  float barHeight = BORDER_FRACTION;
  float verticalEdge = barHeight - vUv.y;
  float verticalAA = fwidth(verticalEdge);
  float verticalMask = smoothstep(0.0, verticalAA, verticalEdge);

  float horizontalEdge = progress - vUv.x;
  float horizontalAA = fwidth(horizontalEdge);
  float horizontalMask = smoothstep(0.0, horizontalAA, horizontalEdge);

  float progressMask = verticalMask * horizontalMask;
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

  vec3 baseBorder = borderColour * progressMask;
  vec3 finalColour = mix(baseBorder, cornerColour, bracketMask);
  float finalAlpha = max(progressMask, bracketMask);

  gl_FragColor = vec4(finalColour, finalAlpha);
}
