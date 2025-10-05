precision highp float;

// Ping-pong position texture for terrain tiles
// Each texel packs: (x, y, z, w) => (unused, yOffset, seed, opacity)

uniform float uTime;
uniform float uDeltaTime;
uniform float uTerrainSpeed; // normalized 0..1

void main() {
  vec2 uv = gl_FragCoord.xy / resolution.xy;
  vec4 prev = texture2D(texturePosition, uv);

  float seed = prev.z;

  // Motion scale: keep very subtle movement at very low speeds
  float s = smoothstep(0.0, 0.6, clamp(uTerrainSpeed, 0.0, 1.0));
  float amp = mix(0.0, 0.05, s);

  // Phase offset by seed to stagger tiles
  float phase = uTime * 2.0 + seed * 6.2831853; // 2*pi
  float y = amp * sin(phase);

  gl_FragColor = vec4(prev.x, y, seed, prev.w);
}
