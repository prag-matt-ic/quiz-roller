precision highp float;

varying float vAlpha;

void main() {
  // Simple grey; replace with lighting if needed later
  vec3 color = vec3(0.62);
  float alpha = clamp(vAlpha, 0.0, 1.0);
  if (alpha <= 0.001) discard;
  gl_FragColor = vec4(color, alpha);
}

