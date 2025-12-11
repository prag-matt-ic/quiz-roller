precision highp float;
precision highp int;

uniform float uDeltaTime;
uniform float uYMin;
uniform float uYMax;
uniform float uGridCols;
uniform float uRowCount;
uniform sampler2D uSpawnMask;
uniform vec2 uSpawnMaskSize;

const float SPEED_MIN = 1.0;
const float SPEED_RANGE = 0.6;
const float EPSILON = 1e-5;

vec3 hash3(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.11369, 0.13787));
  p3 += dot(p3, p3.yzx + 19.19);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

float sampleSpawnMask(float rowIndex, float colIndex) {
  vec2 uv = vec2(
    (colIndex + 0.5) / max(uSpawnMaskSize.x, EPSILON),
    (rowIndex + 0.5) / max(uSpawnMaskSize.y, EPSILON)
  );
  return texture2D(uSpawnMask, uv).r;
}

vec2 pickSpawnCell(vec2 seeds) {
  float rowIndex = 0.0;
  float colIndex = 0.0;
  vec2 cursor = seeds;

  for (int i = 0; i < 12; i++) {
    rowIndex = floor(cursor.x * uRowCount);
    colIndex = floor(cursor.y * uGridCols);
    rowIndex = clamp(rowIndex, 0.0, max(uRowCount - 1.0, 0.0));
    colIndex = clamp(colIndex, 0.0, max(uGridCols - 1.0, 0.0));

    if (sampleSpawnMask(rowIndex, colIndex) > 0.5) {
      return vec2(colIndex, rowIndex);
    }

    cursor = fract(cursor * vec2(3.1, 2.7) + vec2(0.17, 0.53));
  }

  return vec2(colIndex, rowIndex);
}

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 position = texture2D(texturePosition, uv);

  float columnValue = position.x;
  float y = position.y;
  float rowIndex = position.z;
  float speed = position.w;

  float columnIndex = floor(columnValue + 0.5);
  float nextY = y + speed * uDeltaTime;
  bool shouldRespawn = nextY > uYMax;

  if (!shouldRespawn) {
    float columnIsSpawnable = sampleSpawnMask(rowIndex, columnIndex);
    if (columnIsSpawnable < 0.5) {
      shouldRespawn = true;
    }
  }

  if (shouldRespawn) {
    vec3 respawnSeeds = hash3(uv + vec2(nextY, rowIndex));
    vec2 spawnCell = pickSpawnCell(respawnSeeds.xy);

    float jitter = fract(respawnSeeds.z * 43758.5453);
    columnValue = spawnCell.x + jitter;
    rowIndex = spawnCell.y;
    speed = SPEED_MIN + respawnSeeds.x * SPEED_RANGE;
    nextY = uYMin;
  }

  gl_FragColor = vec4(columnValue, nextY, rowIndex, speed);
}
