varying mediump vec2 vMirroredUv;
varying mediump float vPlayerFade;
varying mediump float vCameraFade;

uniform vec2 uPlayerXZ;
uniform vec2 uHeadingCenterXZ;
uniform float uCameraZ;

const highp float PLAYER_FADE_INNER = 2.0;
const highp float PLAYER_FADE_OUTER = 7.0;
const highp float PLAYER_FADE_INNER_SQ = PLAYER_FADE_INNER * PLAYER_FADE_INNER;
const highp float PLAYER_FADE_OUTER_SQ = PLAYER_FADE_OUTER * PLAYER_FADE_OUTER;
const highp float HEADING_MAX_ANGLE = 0.4; // ~23 degrees max tilt
const highp float HEADING_LATERAL_RANGE = 6.0; // world-units span for full tilt

void main() {
  vMirroredUv = vec2(1.0 - uv.x, uv.y);

  // Base world position from mesh transform
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);

  // Gentle, lane-style influence based only on lateral (X) offset.
  // This avoids large jumps when the player crosses in front/behind.
  highp float lateralOffset = uPlayerXZ.x - uHeadingCenterXZ.x;
  highp float t = clamp(lateralOffset / HEADING_LATERAL_RANGE, -1.0, 1.0);
  highp float headingRotation = HEADING_MAX_ANGLE * t;

  highp float c = cos(headingRotation);
  highp float s = sin(headingRotation);
  mat2 rot = mat2(c, -s, s, c);

  // Rotate about the heading's world-space center so it doesn't drift
  vec2 centeredXZ = worldPosition.xz - uHeadingCenterXZ;
  centeredXZ = rot * centeredXZ;
  worldPosition.xz = centeredXZ + uHeadingCenterXZ;

  // Distance-based fades use the rotated world position
  highp vec2 offset = worldPosition.xz - uPlayerXZ;
  highp float distSq = dot(offset, offset);
  vPlayerFade = smoothstep(PLAYER_FADE_INNER_SQ, PLAYER_FADE_OUTER_SQ, distSq);

  highp float distToCamera = uCameraZ - worldPosition.z;
  vCameraFade = smoothstep(6.0, 8.0, distToCamera);

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
