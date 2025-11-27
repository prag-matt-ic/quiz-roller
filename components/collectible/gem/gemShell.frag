precision mediump float;

uniform lowp vec3 uSurfaceColor;
uniform lowp vec3 uLineColor;
uniform lowp float uOpacity;
uniform mediump float uLineWidth;
uniform mediump float uGlowStrength;

varying mediump vec3 vBarycentric;
varying mediump vec3 vNormal;
varying mediump vec3 vViewPosition;
varying mediump vec3 vPosition;
varying mediump float vPulse;
varying mediump float vPulseMix;
varying mediump float vRevealLimit;
varying mediump float vCameraFade;

float getWireFactor(vec3 barycentric, float width) {
  vec3 derivative = fwidth(barycentric);
  vec3 edgeBlend = smoothstep(vec3(0.0), derivative * width, barycentric);
  return 1.0 - min(min(edgeBlend.x, edgeBlend.y), edgeBlend.z);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(vViewPosition);

  // Approx fresnel: pow(x, 2.5) ~ x*x for performance
  float NdotV = max(dot(normal, viewDirection), 0.0);
  float invNdotV = 1.0 - NdotV;
  float fresnel = invNdotV * invNdotV;
  
  float glowContribution = uGlowStrength * fresnel;

  float wireWidth = uLineWidth * mix(1.0, 0.9 + vPulse * 0.3, vPulseMix);
  float wire = getWireFactor(vBarycentric, wireWidth);

  float lambert = max(normal.y, 0.0);
  vec3 litSurface = uSurfaceColor * (0.6 + 0.4 * lambert + glowContribution);

  vec3 finalColor = mix(litSurface, uLineColor, wire);
  float alpha = clamp(uOpacity + wire * 0.35 + glowContribution * 0.3, 0.0, 1.0);

  // Vertical reveal logic
  // Range approx -1.75 to 1.75
  float mask = 1.0 - smoothstep(vRevealLimit, vRevealLimit + 0.5, vPosition.y);
  
  // Ensure minimum visibility (25%) so it doesn't disappear completely
  float revealFactor = mix(0.25, 1.0, mask);
  
  alpha *= revealFactor;

  float pulseScale = mix(1.0, 0.92 + vPulse * 0.12, vPulseMix);
  alpha *= pulseScale;
  alpha *= vCameraFade;

  if (alpha <= 0.01) discard;

  gl_FragColor = vec4(finalColor, alpha);
}
