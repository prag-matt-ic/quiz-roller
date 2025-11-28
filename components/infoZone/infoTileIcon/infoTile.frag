precision mediump float;

#pragma glslify: sampleTilesPalette = require('../../../resources/glsl/tilesPalette.glsl')

uniform float uExitProgress;
uniform sampler2D uIconTexture;

varying float vGradientT;
varying float vVisibility;
varying highp vec3 vWorldNormal;
varying mediump vec2 vUv;

const vec3 WHITE = vec3(1.0);

void main() {
  float visibility = max(0.0, vVisibility);
  if (visibility <= 0.001) {
    discard;
  }
    
  float gradientInput = clamp(vGradientT, 0.0, 1.0);
  vec3 paletteColour = sampleTilesPalette(gradientInput);
  vec3 baseColour = mix(WHITE, paletteColour, 0.35);

  float centerGlow = clamp(1.0 - abs(vUv.x - 0.5) * 2.0, 0.0, 1.0);
  baseColour = mix(baseColour, WHITE, pow(centerGlow, 2.5) * 0.25);

  float verticalHalo = smoothstep(0.0, 0.15, gradientInput) * (1.0 - smoothstep(0.7, 1.0, gradientInput));
  baseColour = mix(baseColour, WHITE, verticalHalo * 0.2);

  float facing = abs(vWorldNormal.z);
  float rim = pow(1.0 - facing, 2.0);
  vec3 color = mix(baseColour, WHITE, rim * 0.08);

  vec4 iconTexel = texture2D(uIconTexture, vUv);
  color = mix(color, iconTexel.rgb, 1.0 - iconTexel.r);

  float fade = smoothstep(0.0, 0.3, visibility);
  gl_FragColor = vec4(color, visibility * fade);
}
