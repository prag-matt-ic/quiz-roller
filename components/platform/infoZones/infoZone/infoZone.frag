// InfoZone border fragment shader
precision mediump float;
precision mediump int;

#pragma glslify: paintCorners = require(../../../../resources/glsl/paintCorners.glsl)

uniform mediump float uAspect; // width / height
uniform mediump float uOpacity;
uniform mediump float uTilesX;
uniform mediump float uTilesY;
uniform mediump float uShowProgress;

varying mediump vec2 vHeightSpacePosition;
varying mediump float vDistanceFade;

const float BORDER_THICKNESS_TILES = 0.25; // thickness relative to a tile height
const float CORNER_LENGTH_TILES = 0.5; // fraction of tile to extend from each corner
const float CORNER_LENGTH_SHOW_TILES = 2.5; // fraction of tile to extend from each corner when showing

void main() {
  float animatedCornerLength = mix(CORNER_LENGTH_TILES, CORNER_LENGTH_TILES * 6.0, uShowProgress);

  float bracketMask = paintCorners(
    vHeightSpacePosition,
    uAspect,
    vec2(uTilesX, uTilesY),
    BORDER_THICKNESS_TILES,
    animatedCornerLength
  );

  vec4 color = vec4(1.0, 1.0, 1.0, uOpacity * bracketMask * vDistanceFade);
  gl_FragColor = color;
}
