precision mediump float;

#pragma glslify: snoise2 = require('glsl-noise/simplex/2d')

uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uD;
uniform vec2 uResolution;

varying vec2 vUv;

vec3 cosinePalette(float t) {
    return uA + uB * cos(6.283185 * (uC * t + uD));
}

vec3 getClampedColour(float t) {
    return clamp(cosinePalette(clamp(t, 0.0, 1.0)), 0.0, 1.0);
}

float grainNoise(vec2 uv) {
    float noise = snoise2(uv * 720.0);
    return clamp(noise * 0.5 + 0.5, 0.0, 1.0);
}

void main() {
    // Radial background starting at bottom-center
    vec2 radialCenter = vec2(0.5, 0.0);
    float distanceFromCenter = distance(vUv, radialCenter);
    float maxDistance = length(vec2(0.5, 1.0));
    float radialT = distanceFromCenter / maxDistance;
    vec3 radialColour = getClampedColour(radialT);
    float backgroundNoise = grainNoise(vUv);
    radialColour *= mix(1.0, 0.5, backgroundNoise);

    // Linear gradient band overlay (50% width, 20% height, centered)
    const float bandWidth = 0.4;
    const float bandHeight = 0.12;
    const float bandStartX = 0.5 - bandWidth * 0.5;
    const float bandEndX = 0.5 + bandWidth * 0.5;
    const float bandStartY = 0.5 - bandHeight * 0.5;
    const float bandEndY = 0.5 + bandHeight * 0.5;

    float linearT = (vUv.x - bandStartX) / bandWidth;
    vec3 linearColour = getClampedColour(linearT);

    float insideX = step(bandStartX, vUv.x) * step(vUv.x, bandEndX);
    float insideY = step(bandStartY, vUv.y) * step(vUv.y, bandEndY);
    float bandMask = insideX * insideY;

    // White border outline with resolution-aware thickness
    const float pixelBorder = 2.0;
    float borderThicknessX = pixelBorder / max(uResolution.x, 1.0);
    float borderThicknessY = pixelBorder / max(uResolution.y, 1.0);

    float expandedInsideY = step(bandStartY - borderThicknessY, vUv.y) * step(vUv.y, bandEndY + borderThicknessY);
    float expandedInsideX = step(bandStartX - borderThicknessX, vUv.x) * step(vUv.x, bandEndX + borderThicknessX);

    bool onLeftBorder = abs(vUv.x - bandStartX) <= borderThicknessX && expandedInsideY > 0.5;
    bool onRightBorder = abs(vUv.x - bandEndX) <= borderThicknessX && expandedInsideY > 0.5;
    bool onBottomBorder = abs(vUv.y - bandStartY) <= borderThicknessY && expandedInsideX > 0.5;
    bool onTopBorder = abs(vUv.y - bandEndY) <= borderThicknessY && expandedInsideX > 0.5;
    float borderMask = (onLeftBorder || onRightBorder || onBottomBorder || onTopBorder) ? 1.0 : 0.0;

    vec3 color = mix(radialColour, linearColour, bandMask);
    color = mix(color, vec3(1.0), borderMask);
    gl_FragColor = vec4(color, 1.0);
}
