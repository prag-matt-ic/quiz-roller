precision highp float;

uniform vec3 uPlayerWorldPos;

varying float vAlpha;
varying vec3 vInstanceCenter;

const float PLAYER_IMPACT_RADIUS = 1.5; // world units

void main() {
  // Base color
  vec3 color = vec3(0.6);

  // Simple highlight when the player is close to the tile center
  float dist = distance(vInstanceCenter, uPlayerWorldPos);
  // Tunable radius; small falloff for a soft highlight
  float highlight = smoothstep(PLAYER_IMPACT_RADIUS, 0.0, dist);
  // Mix toward a bright accent when close
  color = mix(color, vec3(1.0, 0.95, 0.2), highlight * 0.75);

  float alpha = clamp(vAlpha, 0.0, 1.0);
  if (alpha <= 0.001) discard;
  gl_FragColor = vec4(color, alpha);
}
