precision mediump float;

uniform float uTime;
uniform vec2 uResolution;
uniform sampler2D uSceneTexture;
uniform float uSpeed;
uniform int uBlurSteps;
uniform sampler2D uNoiseTexture;

varying vec2 vUv;

// Tuning constants for the post effect.
const int MAX_BLUR_STEPS = 24;
const float BLUR_INTENSITY_EPSILON = 0.001;
const float EDGE_BLUR_THRESHOLD = 0.04;
const float VIGNETTE_DARKNESS = 0.6;
const float BLUR_EXPOSURE = 1.0;
const float NOISE_JITTER_SCALE = 0.006;

// Deterministic 2D noise to break up banding without temporal flicker.
float interleavedGradientNoise(vec2 position) {
  return fract(52.9829189 * fract(dot(position, vec2(0.06711056, 0.00583715))));
}

// Radial blur: sample toward a focus point, weighted by edge intensity.
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
  float noise = interleavedGradientNoise(gl_FragCoord.xy + vec2(uTime));

  vec3 blur = baseColor;
  float weightSum = 1.0;

  for (int i = 0; i < MAX_BLUR_STEPS; i++) {
    if (i >= uBlurSteps) break;
    float stepIndex = float(i) + 1.0;
    float stepT = stepIndex * invSteps;
    float mixAmount = stepT * baseMix;

    // Deterministic per-pixel jitter to reduce banding without heavy noise.
    float jitter = (noise - 0.5) * NOISE_JITTER_SCALE;

    vec2 sampleUv = uv + blurOffset * mixAmount + jitterDir * jitter;
    sampleUv = clamp(sampleUv, 0.001, 0.999);

    vec3 tap = texture2D(uSceneTexture, sampleUv).rgb;
    float w = (1.0 - stepT * 0.6) * intensity;

    blur += tap * w;
    weightSum += w;
  }

  blur /= weightSum;
  blur *= BLUR_EXPOSURE;
  return mix(baseColor, blur, intensity);
}

// Adds subtle edge noise-based darkening to keep motion blur from looking flat.
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

  float signedSpeed = clamp(uSpeed, -1.0, 1.0);
  float speed = abs(signedSpeed);

  // Center-preserving vignette. We reuse its inverse as the edge-only mask.
  float vignetteStart = 0.4 - speed * 0.15;
  float vignette = 1.0 - smoothstep(vignetteStart, 0.8, dist);

  float vignetteFade = mix(1.0, vignette, VIGNETTE_DARKNESS);
  float edgeMask = 1.0 - vignette;

  float intensity = clamp(edgeMask * speed, 0.0, 1.0);

  // Skip blur when intensity is negligible to save work.
  bool skipBlur =
      intensity <= BLUR_INTENSITY_EPSILON || edgeMask <= EDGE_BLUR_THRESHOLD || uBlurSteps == 0;

  vec3 blurredColor = skipBlur ? color.rgb : applyRadialBlur(vUv, color.rgb, intensity, signedSpeed);
  vec3 desaturated = applyNoiseDarkening(vUv, blurredColor, speed, edgeMask);

  vec3 finalColor = desaturated;
  finalColor *= vignetteFade;

  gl_FragColor = vec4(finalColor, 1.0);
}
