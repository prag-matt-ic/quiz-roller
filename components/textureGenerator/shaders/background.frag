#pragma glslify: getColourFromPalette = require(../../palette.glsl)
#pragma glslify: grainyNoise = require(../helpers/grainyNoise.glsl)
#pragma glslify: fractalNoise = require(../helpers/fractalNoise.glsl)
#pragma glslify: darkVignette = require(../helpers/darkVignette.glsl)
#pragma glslify: worley2D = require(../helpers/worley2D.glsl)

uniform float uTime;
uniform vec2 uResolution;
uniform float uSeed;
uniform int uPaletteIndex;
uniform float uSampleWeight;

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

void main() {
    vec2 uv = vUv;
    // Aspect ratio correction helpers
    float aspect = uResolution.x / uResolution.y;
    vec2 aspectScale = vec2(aspect, 1.0);

    // Center coordinates with aspect correction
    vec2 centeredUv = (uv - 0.5) * aspectScale;

    // Distance from center
    float dist = length(centeredUv) * 0.8;

    // Layer 1: Fractal noise for organic base
    vec2 noiseUv = uv * aspectScale;
    float fbm = fractalNoise(noiseUv * uFbmScale + uSeed, uFbmOctaves, uFbmLacunarity, uFbmGain);

    // Layer 2: Grainy noise for texture
    float grain = grainyNoise(noiseUv + uSeed * 1.0, uGrainScale, uGrainAmplitude);

    // Layer 3: Worley noise for cellular patterns
    // vec2 F = worley2D(noiseUv * uWorleyScale + uSeed * 0.01, uWorleyJitter, uWorleyManhattan);
    // float worleyPattern;
    // if (uWorleyPattern == 0) {
    //     worleyPattern = F.x; // F1
    // } else if (uWorleyPattern == 1) {
    //     worleyPattern = F.y; // F2
    // } else {
    //     worleyPattern = F.y - F.x; // F2-F1 (cell borders)
    // }
    
    // Combine distance gradient with layered noises
    float t = dist + fbm * uFbmMix + (grain - 0.5) * uGrainMix;
    
    // Get color from palette
    vec3 color = getColourFromPalette(uPaletteIndex, t) * uSampleWeight;
    
    // Blend with dark grey for atmospheric effect
    vec3 darkGrey = vec3(0.01, 0.01, 0.01);
    color = mix(darkGrey, color, 0.9);
    
    // Apply dark vignette (controlled by uniforms)
    float vignetteAmount = darkVignette(centeredUv, uVignetteStrength);
    color *= vignetteAmount;
    
    gl_FragColor = vec4(color, 1.0);
}
