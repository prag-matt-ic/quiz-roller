precision mediump float;
precision mediump int;

varying mediump vec2 vUv;
varying highp vec3 vWorldPosition;

uniform sampler2D uTexture;
uniform float uOpacity;
uniform vec2 uPlayerXZ;

const float ALPHA_EPSILON = 0.001;
const highp float PLAYER_FADE_INNER = 1.5;
const highp float PLAYER_FADE_OUTER = 4.0;
const highp float PLAYER_FADE_INNER_SQ = PLAYER_FADE_INNER * PLAYER_FADE_INNER;
const highp float PLAYER_FADE_OUTER_SQ = PLAYER_FADE_OUTER * PLAYER_FADE_OUTER;

void main() {
  vec2 mirroredUv = vec2(1.0 - vUv.x, vUv.y);
  lowp vec4 texel = texture2D(uTexture, mirroredUv);

  highp vec2 offset = vWorldPosition.xz - uPlayerXZ;
  highp float distSq = dot(offset, offset);
  float fade = smoothstep(PLAYER_FADE_INNER_SQ, PLAYER_FADE_OUTER_SQ, distSq);

  float alpha = texel.a * uOpacity * fade;
  if (alpha <= ALPHA_EPSILON) discard;

  gl_FragColor = vec4(texel.rgb, alpha);
}
