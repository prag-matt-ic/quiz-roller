precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uSceneTexture;
uniform float uSpeed;
uniform int uBlurSteps;
uniform sampler2D uNoiseTexture;

varying vec2 vUv;

const int MAX_BLUR_STEPS = 16;
const float BLUR_INTENSITY_EPSILON = 0.001;
const float EDGE_BLUR_THRESHOLD = 0.04;

vec3 applyRadialBlur(
  vec2 uv,
  vec3 baseColor,
  float intensity,
  float signedSpeed
) {
  if (intensity <= BLUR_INTENSITY_EPSILON || uBlurSteps == 0) return baseColor;
  const vec2 focus = vec2(0.5, 0.45);
  float directionSign = signedSpeed >= 0.0 ? 1.0 : -1.0;
  vec2 blurOffset = (focus - uv) * directionSign;
  vec2 blurRadialDir = normalize(blurOffset + 1e-5);
  vec2 jitterDir = vec2(-blurRadialDir.y, blurRadialDir.x);
  float invSteps = 1.0 / float(uBlurSteps);
  float baseMix = 0.6 * intensity;
  float timePhase = uTime * 3.7;

  vec3 blur = baseColor;
  float weightSum = 1.0;

  for (int i = 0; i < MAX_BLUR_STEPS; i++) {
    if (i >= uBlurSteps) break;
    float stepIndex = float(i) + 1.0;
    float stepT = stepIndex * invSteps;
    float mixAmount = stepT * baseMix;

    // Minor temporal jitter to reduce banding without heavy noise.
    float jitter = (sin(timePhase + stepIndex * 2.1) * 0.5 + 0.5) * 0.0015;

    vec2 sampleUv = uv + blurOffset * mixAmount + jitterDir * jitter;
    sampleUv = clamp(sampleUv, 0.001, 0.999);

    vec3 tap = texture2D(uSceneTexture, sampleUv).rgb;
    float w = (1.0 - stepT * 0.6) * intensity;

    blur += tap * w;
    weightSum += w;
  }

  blur /= weightSum;
  return mix(baseColor, blur, intensity);
}

vec3 applyNoiseDarkening(
  in vec2 uv,
  in vec3 baseColor,
  in float speed,
  in float edgeMask
) {
  float noise = texture2D(uNoiseTexture, uv).r;
  float noiseMask = clamp(noise * edgeMask, 0.0, 1.0);
  float amount = noiseMask * speed;
  if (amount <= 0.0001) return baseColor;
  vec3 dark = baseColor - vec3(0.24);
  return mix(baseColor, dark, amount);
}

void main() {
  vec4 color = texture2D(uSceneTexture, vUv);

  vec2 centeredUv = vUv - 0.5;
  centeredUv.x *= uResolution.x / uResolution.y;
  float dist = length(centeredUv);

  // Center-preserving vignette. We reuse its inverse as the edge-only mask.
  float vignette = 1.0 - smoothstep(0.4, 0.8, dist);

  float vignetteDarkness = 0.5;
  float vignetteFade = mix(1.0, vignette, vignetteDarkness);
  float edgeMask = 1.0 - vignette;
  float signedSpeed = clamp(uSpeed, -1.0, 1.0);
  float speed = abs(signedSpeed);
  float intensity = clamp(edgeMask * speed, 0.0, 1.0);

  bool skipBlur =
      intensity <= BLUR_INTENSITY_EPSILON || edgeMask <= EDGE_BLUR_THRESHOLD || uBlurSteps == 0;

  vec3 blurredColor = skipBlur ? color.rgb : applyRadialBlur(vUv, color.rgb, intensity, signedSpeed);
  vec3 desaturated = applyNoiseDarkening(vUv, blurredColor, speed, edgeMask);

  vec3 finalColor = desaturated;
  finalColor *= vignetteFade;

  gl_FragColor = vec4(finalColor, 1.0);
}
