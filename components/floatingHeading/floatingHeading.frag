precision mediump float;
precision mediump int;

varying mediump vec2 vUv;
varying highp vec3 vWorldPosition;

uniform sampler2D uTexture;
uniform float uOpacity;
uniform vec2 uPlayerXZ;
uniform float uPlayerFadeInner;
uniform float uPlayerFadeOuter;

const float ALPHA_EPSILON = 0.001;

void main() {
  vec2 mirroredUv = vec2(1.0 - vUv.x, vUv.y);
  lowp vec4 texel = texture2D(uTexture, mirroredUv);

  highp vec2 offset = vWorldPosition.xz - uPlayerXZ;
  highp float distSq = dot(offset, offset);
  highp float innerSq = uPlayerFadeInner * uPlayerFadeInner;
  highp float outerSq = uPlayerFadeOuter * uPlayerFadeOuter;
  float fade = smoothstep(innerSq, outerSq, distSq);

  float alpha = texel.a * uOpacity * fade;
  if (alpha <= ALPHA_EPSILON) discard;

  gl_FragColor = vec4(texel.rgb, alpha);
}
