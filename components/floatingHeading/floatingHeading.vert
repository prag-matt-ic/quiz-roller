varying mediump vec2 vMirroredUv;
varying mediump float vPlayerFade;

uniform vec2 uPlayerXZ;

const highp float PLAYER_FADE_INNER = 2.0;
const highp float PLAYER_FADE_OUTER = 7.0;
const highp float PLAYER_FADE_INNER_SQ = PLAYER_FADE_INNER * PLAYER_FADE_INNER;
const highp float PLAYER_FADE_OUTER_SQ = PLAYER_FADE_OUTER * PLAYER_FADE_OUTER;

void main() {
  vMirroredUv = vec2(1.0 - uv.x, uv.y);

  vec4 worldPosition = modelMatrix * vec4(position, 1.0);

  highp vec2 offset = worldPosition.xz - uPlayerXZ;
  highp float distSq = dot(offset, offset);
  vPlayerFade = smoothstep(PLAYER_FADE_INNER_SQ, PLAYER_FADE_OUTER_SQ, distSq);

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
