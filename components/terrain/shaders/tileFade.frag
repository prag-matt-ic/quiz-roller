precision highp float;

uniform vec3 uPlayerWorldPos;

varying float vAlpha;
varying vec3 vInstanceCenter;

void main() {
  // Base color
  vec3 color = vec3(0.62);

  // Simple highlight when the player is close to the tile center
  float dist = distance(vInstanceCenter, uPlayerWorldPos);
  // Tunable radius; small falloff for a soft highlight
  float radius = 1.1; // world units
  float highlight = smoothstep(radius, 0.0, dist);
  // Mix toward a bright accent when close
  color = mix(color, vec3(1.0, 0.95, 0.2), highlight * 0.85);

  float alpha = clamp(vAlpha, 0.0, 1.0);
  if (alpha <= 0.001) discard;
  gl_FragColor = vec4(color, alpha);
}
