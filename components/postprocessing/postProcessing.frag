precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uSceneTexture;
uniform float uSpeed;

varying vec2 vUv;

const int BLUR_STEPS = 12;
const float VIGNETTE_STRENGTH = 0.75; // 0 = no fade, 1 = full vignette
const float BLUR_INTENSITY_EPSILON = 0.001;
const float EDGE_BLUR_THRESHOLD = 0.02;

void main() {
  vec4 color = texture2D(uSceneTexture, vUv);

  vec2 centeredUv = vUv - 0.5;
  centeredUv.x *= uResolution.x / uResolution.y;
  float dist = length(centeredUv);

  // Center-preserving vignette. We reuse its inverse as the edge-only mask.
  float vignette = 1.0 - smoothstep(0.4, 0.8, dist);

  float vignetteFade = mix(1.0, vignette, VIGNETTE_STRENGTH);
  float edgeMask = 1.0 - vignette;
  float signedSpeed = clamp(uSpeed, -1.0, 1.0);
  float speed = abs(signedSpeed);
  float intensity = clamp(edgeMask * speed, 0.0, 1.0);

  bool skipBlur = intensity <= BLUR_INTENSITY_EPSILON || edgeMask <= EDGE_BLUR_THRESHOLD;
  if (skipBlur) {
    gl_FragColor = vec4(color.rgb * vignetteFade, 1.0);
    return;
  }

  // Radial blur pulled toward the center; only applied near the edges via edgeMask.
  vec3 blur = color.rgb;
  float weightSum = 1.0;
  const vec2 focus = vec2(0.5, 0.45);
  float directionSign = signedSpeed >= 0.0 ? 1.0 : -1.0;
  // Positive (forward) pulls blur inward; negative (backward) pushes outward.
  vec2 blurDir = directionSign >= 0.0 ? (focus - vUv) : (vUv - focus);
  vec2 radialDir = normalize(blurDir + 1e-5);
  vec2 jitterDir = vec2(-radialDir.y, radialDir.x);
  float invSteps = 1.0 / float(BLUR_STEPS);
  float baseMix = 0.6 * intensity;

  for (int i = 0; i < BLUR_STEPS; i++) {
    float t = (float(i) + 1.0) * invSteps;
    float mixAmount = t * baseMix;

    // Minor temporal jitter to reduce banding without heavy noise.
    float jitter = (sin(uTime * 3.7 + float(i) * 2.1) * 0.5 + 0.5) * 0.0015;

    vec2 inwardTarget = mix(vUv, focus, mixAmount);
    vec2 outwardTarget = mix(vUv, focus, -mixAmount);
    vec2 sampleUv = (directionSign > 0.0 ? inwardTarget : outwardTarget) + jitterDir * jitter;
    sampleUv = clamp(sampleUv, 0.001, 0.999);

    vec3 tap = texture2D(uSceneTexture, sampleUv).rgb;
    float w = (1.0 - t * 0.6) * intensity;

    blur += tap * w;
    weightSum += w;
  }

  blur /= weightSum;

  vec3 finalColor = mix(color.rgb, blur, intensity);
  finalColor *= vignetteFade;

  gl_FragColor = vec4(finalColor, 1.0);
}
