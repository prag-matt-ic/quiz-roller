precision highp float;
precision highp int;

uniform vec3 uSurfaceColor;
uniform vec3 uLineColor;
uniform float uOpacity;
uniform float uLineWidth;
uniform float uGlowStrength;

varying vec3 vBarycentric;
varying vec3 vNormal;
varying vec3 vViewPosition;

float getWireFactor(vec3 barycentric, float width) {
  vec3 derivative = fwidth(barycentric);
  vec3 edgeBlend = smoothstep(vec3(0.0), derivative * width, barycentric);
  return 1.0 - min(min(edgeBlend.x, edgeBlend.y), edgeBlend.z);
}

void main() {
  vec3 normal = normalize(vNormal);
  vec3 viewDirection = normalize(vViewPosition);

  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 2.5);
  float glowContribution = uGlowStrength * fresnel;

  float wire = getWireFactor(vBarycentric, uLineWidth);

  vec3 litSurface = uSurfaceColor * (0.6 + 0.4 * max(normal.y, 0.0));
  litSurface += glowContribution * uSurfaceColor;

  vec3 finalColor = mix(litSurface, uLineColor, clamp(wire, 0.0, 1.0));
  float alpha = clamp(uOpacity + wire * 0.35 + glowContribution * 0.3, 0.0, 1.0);

  if (alpha <= 0.01) {
    discard;
  }

  gl_FragColor = vec4(finalColor, alpha);
}
