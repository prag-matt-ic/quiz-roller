// Signed distance to an axis-aligned box centered at origin with given half-size bounds
float sdBox(in vec2 position, in vec2 bounds) {
  vec2 d = abs(position) - bounds;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

#pragma glslify: export(sdBox)

