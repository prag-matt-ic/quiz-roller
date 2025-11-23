#pragma glslify: grainyNoise = require(../helpers/grainyNoise.glsl)
#pragma glslify: fractalNoise = require(../helpers/fractalNoise.glsl)
#pragma glslify: vignette = require(../helpers/vignette.glsl)
#pragma glslify: worley2D = require(../helpers/worley2D.glsl)

uniform float uTime;
uniform vec2 uResolution;
uniform float uSeed;
uniform float uSampleWeight;
uniform float uBlackMix;
uniform bool uShowGradientOverlay;
uniform vec2 uOriginOffset;

// Cosine Palette Uniforms
uniform vec3 uA;
uniform vec3 uB;
uniform vec3 uC;
uniform vec3 uD;

// Grainy Noise uniforms
uniform float uGrainScale;
uniform float uGrainAmplitude;
uniform float uGrainMix;

// Fractal Noise uniforms
uniform float uFbmScale;
uniform int uFbmOctaves;
uniform float uFbmLacunarity;
uniform float uFbmGain;
uniform float uFbmMix;

// Vignette uniforms
uniform float uVignetteStrength;
uniform float uVignetteRadius;
uniform float uVignetteSmoothness;

// Worley Noise uniforms
uniform float uWorleyScale;
uniform float uWorleyJitter;
uniform bool uWorleyManhattan;
uniform int uWorleyPattern;
uniform float uWorleyMix;

varying vec2 vUv;

// Cosine palette function
// http://dev.thi.ng/gradients/
vec3 cosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.283185 * (c * t + d));
}

vec3 getClampedColour(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return clamp(cosinePalette(clamp(t, 0.0, 1.0), a, b, c, d), 0.0, 1.0);
}

vec3 applyGradientOverlay(vec3 baseColor, vec2 uv, vec3 a, vec3 b, vec3 c, vec3 d) {
    // Linear gradient band overlay (50% width, 20% height, centered)
    const float bandWidth = 0.4;
    const float bandHeight = 0.12;
    const float bandStartX = 0.5 - bandWidth * 0.5;
    const float bandEndX = 0.5 + bandWidth * 0.5;
    const float bandStartY = 0.5 - bandHeight * 0.5;
    const float bandEndY = 0.5 + bandHeight * 0.5;

    float linearT = (uv.x - bandStartX) / bandWidth;
    vec3 linearColour = getClampedColour(linearT, a, b, c, d);

    float insideX = step(bandStartX, uv.x) * step(uv.x, bandEndX);
    float insideY = step(bandStartY, uv.y) * step(uv.y, bandEndY);
    float bandMask = insideX * insideY;

    // White border outline with resolution-aware thickness
    const float pixelBorder = 2.0;
    float borderThicknessX = pixelBorder / max(uResolution.x, 1.0);
    float borderThicknessY = pixelBorder / max(uResolution.y, 1.0);

    float expandedInsideY = step(bandStartY - borderThicknessY, uv.y) * step(uv.y, bandEndY + borderThicknessY);
    float expandedInsideX = step(bandStartX - borderThicknessX, uv.x) * step(uv.x, bandEndX + borderThicknessX);

    bool onLeftBorder = abs(uv.x - bandStartX) <= borderThicknessX && expandedInsideY > 0.5;
    bool onRightBorder = abs(uv.x - bandEndX) <= borderThicknessX && expandedInsideY > 0.5;
    bool onBottomBorder = abs(uv.y - bandStartY) <= borderThicknessY && expandedInsideX > 0.5;
    bool onTopBorder = abs(uv.y - bandEndY) <= borderThicknessY && expandedInsideX > 0.5;
    float borderMask = (onLeftBorder || onRightBorder || onBottomBorder || onTopBorder) ? 1.0 : 0.0;

    vec3 color = mix(baseColor, linearColour, bandMask);
    color = mix(color, vec3(1.0), borderMask);
    return color;
}


void main() {
    vec2 uv = vUv;
    // Aspect ratio correction helpers
    float aspect = uResolution.x / uResolution.y;
    vec2 aspectScale = vec2(aspect, 1.0);

    // Center coordinates with aspect correction
    vec2 centeredUv = (uv - 0.5) * aspectScale;
    
    // Apply origin offset (also aspect corrected)
    vec2 offset = uOriginOffset * aspectScale;
    vec2 offsetUv = centeredUv - offset;

    // Distance from center (modified by offset)
    float dist = length(offsetUv) * 0.8;


    // Layer 1: Fractal noise for organic base
    vec2 noiseUv = uv * aspectScale;
    float fbm = fractalNoise(noiseUv * uFbmScale + uSeed, uFbmOctaves, uFbmLacunarity, uFbmGain);

    // Layer 2: Grainy noise for texture
    float grain = grainyNoise(noiseUv + uSeed * 1.0, uGrainScale, uGrainAmplitude);

    // Layer 3: Worley noise for cellular patterns
    vec2 F = worley2D(noiseUv * uWorleyScale + uSeed * 0.01, uWorleyJitter, uWorleyManhattan);
    float worleyPattern;
    if (uWorleyPattern == 0) {
        worleyPattern = F.x; // F1
    } else if (uWorleyPattern == 1) {
        worleyPattern = F.y; // F2
    } else {
        worleyPattern = F.y - F.x; // F2-F1 (cell borders)
    }
    
    // Combine distance gradient with layered noises
    float t = dist + fbm * uFbmMix + (grain - 0.5) * uGrainMix + worleyPattern * uWorleyMix;
    
    // Get color from dynamic cosine palette
    vec3 color = cosinePalette(t, uA, uB, uC, uD) * uSampleWeight;
    
    // Apply dark vignette (controlled by uniforms)
    float vignetteAmount = vignette(centeredUv, uVignetteStrength, uVignetteRadius, uVignetteSmoothness, true);
    color *= vignetteAmount;

    // Apply final black mix
    color = mix(color, vec3(0.0), uBlackMix);

    // Apply gradient overlay if enabled
    if (uShowGradientOverlay) {
        color = applyGradientOverlay(color, vUv, uA, uB, uC, uD);
    }

    gl_FragColor = vec4(color, 1.0);
}
