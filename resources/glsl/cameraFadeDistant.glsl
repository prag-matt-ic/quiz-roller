const float CAMERA_FADE_DISTANT_START = 18.0;
const float CAMERA_FADE_DISTANT_END = 20.0;

float cameraFadeDistant(float cameraZ, float worldZ) {
  float distToCamera = cameraZ - worldZ;
  float fade = 1.0 - smoothstep(CAMERA_FADE_DISTANT_START, CAMERA_FADE_DISTANT_END, distToCamera);
  return fade;
}

#pragma glslify: export(cameraFadeDistant)
