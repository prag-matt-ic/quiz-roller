precision mediump float;

#pragma glslify: noise = require('glsl-noise/simplex/3d')

uniform lowp vec3 uSurfaceColor;
uniform lowp vec3 uLineColor;
uniform lowp float uOpacity;
uniform mediump float uGlowStrength;
uniform lowp float uVeinsEnabled;
uniform highp float uTime;
uniform sampler2D uNoiseTexture;

varying mediump vec3 vNormal;
varying mediump vec3 vViewPosition;
varying mediump float vCameraFade;
varying mediump float vHiddenOpacity;
varying highp vec3 vLocalPos;

// -------- Mineral vein constants --------
const float VEIN_NOISE_FREQUENCY = 0.66;
const float VEIN_ANIMATION_SPEED = 0.1;
const float VEIN_INTENSITY = 0.5; // Increased slightly for visibility
const float VEIN_BRIGHTEN_STRENGTH = 0.3;

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(vViewPosition);

  float NdotV = max(dot(normal, viewDirection), 0.0);
  float invNdotV = 1.0 - NdotV;
  float fresnel = invNdotV * invNdotV;

  float glowContribution = uGlowStrength * fresnel;
  float lambert = max(normal.y, 0.0);

  vec3 unitLocalPos = normalize(vLocalPos);
  vec2 noiseUv = vec2(atan(unitLocalPos.z, unitLocalPos.x) * 0.15915494 + 0.5, unitLocalPos.y * 0.5 + 0.5);
  float noiseFactor = texture2D(uNoiseTexture, noiseUv).r;

  vec3 litSurface = uSurfaceColor * (0.6 + 0.4 * lambert) * noiseFactor;
  vec3 glowColor = uLineColor * (0.4 + glowContribution);

  // Vein logic
  vec3 veinContribution = vec3(0.0);
  float veinAlphaContribution = 0.0;

  if (uVeinsEnabled > 0.5) {
    float animatedTime = uTime * VEIN_ANIMATION_SPEED;
    float veinNoise = noise(unitLocalPos * VEIN_NOISE_FREQUENCY + animatedTime);
    float veinMask = clamp(1.0 - abs(veinNoise), 0.0, 1.0);
    veinMask = veinMask * veinMask * sqrt(veinMask); // x^(2.5) falloff without pow

    vec3 veinColour = glowColor * (1.0 - VEIN_BRIGHTEN_STRENGTH) + VEIN_BRIGHTEN_STRENGTH;
    veinContribution = veinColour * veinMask * VEIN_INTENSITY;
    veinAlphaContribution = veinMask * 0.2;
  }
  
  // Additive veins
  vec3 finalColor = litSurface + glowColor * 0.2 + veinContribution;

  float baseAlpha = uOpacity * vHiddenOpacity;
  float alpha = clamp(baseAlpha + veinAlphaContribution + glowContribution * 0.15, 0.0, 1.0);
  alpha *= vHiddenOpacity;
  alpha *= vCameraFade;

  if (alpha <= 0.01) discard;

  gl_FragColor = vec4(finalColor, alpha);
}
