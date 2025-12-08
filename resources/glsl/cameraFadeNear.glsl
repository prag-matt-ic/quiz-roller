const float CAMERA_FADE_NEAR_START = 8.0;
const float CAMERA_FADE_NEAR_END = 14.0;

float cameraFadeNear(float cameraZ, float worldZ) {
  float distToCamera = cameraZ - worldZ;
  return smoothstep(CAMERA_FADE_NEAR_START, CAMERA_FADE_NEAR_END, distToCamera);
}

#pragma glslify: export(cameraFadeNear)
