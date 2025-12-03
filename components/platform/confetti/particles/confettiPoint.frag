precision mediump float;

varying vec4 vColorAlpha;
varying mediump float vSoftness;

void main() {
  vec2 centered = gl_PointCoord - vec2(0.5);
  float dist = length(centered);
  
  float softEdge = mix(0.0, 0.45, vSoftness);
  float hardRadius = 0.5 - softEdge * 0.5;
  float circle = 1.0 - smoothstep(hardRadius, 0.5, dist);

  float alpha = vColorAlpha.a * circle;
  if (alpha < 0.01) discard;

  gl_FragColor = vec4(vColorAlpha.rgb, alpha);
}
