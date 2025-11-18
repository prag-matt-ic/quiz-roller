// Corner bracket mask utility derived from InfoZone shader
#pragma glslify: sdBox = require(../sdBox.glsl)

const float MIN_AA = 1e-4;

float paintCorners(
  vec2 heightSpacePosition,
  float aspect,
  vec2 tileCounts,
  float borderThicknessTiles,
  float cornerLengthTiles
) {
  vec2 outerBounds = vec2(0.5 * aspect, 0.5);
  vec2 tilesHalf = max(tileCounts * 0.5, vec2(MIN_AA));
  vec2 tilesPerUnit = tilesHalf / outerBounds;
  vec2 borderThickness = max(vec2(borderThicknessTiles) / tilesPerUnit, vec2(0.0));
  vec2 innerBounds = outerBounds - borderThickness;

  float dInner = sdBox(heightSpacePosition, innerBounds);
  float aa = fwidth(dInner);
  float borderMask = smoothstep(0.0, aa, dInner);

  vec2 distToEdge = tilesHalf - abs(heightSpacePosition) * tilesPerUnit;
  vec2 distAA = vec2(
    max(fwidth(distToEdge.x), MIN_AA),
    max(fwidth(distToEdge.y), MIN_AA)
  );
  vec2 edgeMask = 1.0 - smoothstep(
    vec2(borderThicknessTiles),
    vec2(borderThicknessTiles) + distAA,
    distToEdge
  );

  vec2 cornerLengths = vec2(cornerLengthTiles);
  vec2 clampedDist = max(distToEdge, vec2(0.0));
  vec2 lengthMask = 1.0 - smoothstep(
    cornerLengths,
    cornerLengths + distAA,
    clampedDist
  );

  float horizontalBracket = edgeMask.y * lengthMask.x;
  float verticalBracket = edgeMask.x * lengthMask.y;
  float cornerBrackets = max(horizontalBracket, verticalBracket);

  return borderMask * cornerBrackets;
}

#pragma glslify: export(paintCorners)
