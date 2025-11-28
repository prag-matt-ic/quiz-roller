precision mediump float;

uniform lowp vec3 uSurfaceColor;
uniform lowp vec3 uLineColor;
uniform lowp float uOpacity;
uniform mediump float uLineWidth;
uniform mediump float uGlowStrength;

varying mediump vec3 vBarycentric;
varying mediump vec3 vNormal;
varying mediump vec3 vViewPosition;
varying mediump float vCameraFade;
varying mediump float vHiddenOpacity;

float getWireFactor(vec3 barycentric, float width) {
  vec3 derivative = fwidth(barycentric);
  vec3 edgeBlend = smoothstep(vec3(0.0), derivative * width, barycentric);
  return 1.0 - min(min(edgeBlend.x, edgeBlend.y), edgeBlend.z);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(vViewPosition);

  float NdotV = max(dot(normal, viewDirection), 0.0);
  float invNdotV = 1.0 - NdotV;
  float fresnel = invNdotV * invNdotV;

  float glowContribution = uGlowStrength * fresnel;
  float lambert = max(normal.y, 0.0);

  vec3 litSurface = uSurfaceColor * (0.6 + 0.4 * lambert);
  vec3 glowColor = uLineColor * (0.4 + glowContribution);

  float wire = getWireFactor(vBarycentric, uLineWidth);
  vec3 finalColor = mix(litSurface + glowColor * 0.2, glowColor, wire);

  float baseAlpha = uOpacity * vHiddenOpacity;
  float alpha = clamp(baseAlpha + wire * 0.2 + glowContribution * 0.15, 0.0, 1.0);
  alpha *= vHiddenOpacity;
  alpha *= vCameraFade;

  if (alpha <= 0.01) discard;

  gl_FragColor = vec4(finalColor, alpha);
}
