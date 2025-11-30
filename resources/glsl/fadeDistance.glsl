const float FADE_DISTANCE_START = 7.0;
const float FADE_DISTANCE_END = 12.0;

float fadeDistance(float worldZ) {
  float distFromOrigin = abs(worldZ);
  float fade = 1.0 - smoothstep(FADE_DISTANCE_START, FADE_DISTANCE_END, distFromOrigin);
  return fade;
}

#pragma glslify: export(fadeDistance)
