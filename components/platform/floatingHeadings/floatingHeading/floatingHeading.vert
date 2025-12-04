#pragma glslify: cameraFadeNear = require('../../../../resources/glsl/cameraFadeNear.glsl')
#pragma glslify: fadeDistance = require('../../../../resources/glsl/fadeDistance.glsl')

varying mediump vec2 vMirroredUv;
varying mediump float vPlayerFade;
varying mediump float vCameraFade;

uniform vec2 uPlayerXZ;
uniform vec2 uHeadingCenterXZ;
uniform float uCameraZ;
uniform float uEnableRotation;
uniform float uUsePlayerFade;
uniform float uDistanceFadeEnabled;

// Use a softer lateral fade (X) so headings do not pop when the player crosses lanes.
const highp float PLAYER_FADE_X_INNER = 1.0;
const highp float PLAYER_FADE_X_OUTER = 10.0;
const highp float PLAYER_FADE_Z_INNER = 1.0;
const highp float PLAYER_FADE_Z_OUTER = 6.0;
const highp float PLAYER_FADE_X_INNER_SQ = PLAYER_FADE_X_INNER * PLAYER_FADE_X_INNER;
const highp float PLAYER_FADE_X_OUTER_SQ = PLAYER_FADE_X_OUTER * PLAYER_FADE_X_OUTER;
const highp float PLAYER_FADE_Z_INNER_SQ = PLAYER_FADE_Z_INNER * PLAYER_FADE_Z_INNER;
const highp float PLAYER_FADE_Z_OUTER_SQ = PLAYER_FADE_Z_OUTER * PLAYER_FADE_Z_OUTER;
const highp float HEADING_MAX_ANGLE = 0.4; // ~23 degrees max tilt
const highp float HEADING_LATERAL_RANGE = 6.0; // world-units span for full tilt

float playerDistanceFade(vec2 offset) {
  highp float lateralFade = smoothstep(PLAYER_FADE_X_INNER_SQ, PLAYER_FADE_X_OUTER_SQ, offset.x * offset.x);
  highp float depthFade = smoothstep(PLAYER_FADE_Z_INNER_SQ, PLAYER_FADE_Z_OUTER_SQ, offset.y * offset.y);
  // Use the stronger (max) fade so approaching from either axis keeps the heading visible.
  return max(lateralFade, depthFade);
}

void main() {
  vMirroredUv = vec2(1.0 - uv.x, uv.y);

  // Base world position from mesh transform
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);

  if (uEnableRotation > 0.5) {
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
  }

  // Distance-based fades use the rotated world position
  if (uUsePlayerFade > 0.5) {
    highp vec2 offset = worldPosition.xz - uPlayerXZ;
    vPlayerFade = playerDistanceFade(offset);
  } else {
    vPlayerFade = 1.0;
  }

  if (uDistanceFadeEnabled > 0.5) {
    highp float nearFade = cameraFadeNear(uCameraZ, uHeadingCenterXZ.y - 8.0);
    highp float distantFade = fadeDistance(uHeadingCenterXZ.y - 8.0);
    vCameraFade = nearFade * distantFade;
  } else {
    vCameraFade = 1.0;
  }

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
