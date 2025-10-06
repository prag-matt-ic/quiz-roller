#pragma glslify: getColourFromPalette = require(../../palette.glsl)
#pragma glslify: grainyNoise = require(../helpers/grainyNoise.glsl)
#pragma glslify: fractalNoise = require(../helpers/fractalNoise.glsl)
#pragma glslify: darkVignette = require(../helpers/darkVignette.glsl)
#pragma glslify: worley2D = require(../helpers/worley2D.glsl)

uniform float uTime;
uniform vec2 uResolution;
uniform float uSeed;

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
    
    // Center coordinates
    vec2 centeredUv = uv - 0.5;
    
    // Aspect ratio correction
    float aspect = uResolution.x / uResolution.y;
    centeredUv.x *= aspect;
    
    // Distance from center
    float dist = length(centeredUv);
    
    // Layer 1: Fractal noise for organic base (controlled by uniforms)
    float fbm = fractalNoise(uv * uFbmScale + uSeed, uFbmOctaves, uFbmLacunarity, uFbmGain);
    
    // Layer 2: Grainy noise for texture (controlled by uniforms)
    float grain = grainyNoise(uv + uSeed * 0.1, uGrainScale, uGrainAmplitude);
    
    // Layer 3: Worley noise for cellular patterns (controlled by uniforms)
    vec2 F = worley2D(uv * uWorleyScale + uSeed * 0.01, uWorleyJitter, uWorleyManhattan);
    float worleyPattern;
    if (uWorleyPattern == 0) {
        worleyPattern = F.x; // F1
    } else if (uWorleyPattern == 1) {
        worleyPattern = F.y; // F2
    } else {
        worleyPattern = F.y - F.x; // F2-F1 (cell borders)
    }
    
    // Combine distance gradient with layered noise (using mix uniforms)
    float t = dist + fbm * uFbmMix + (grain - 0.5) * uGrainMix + worleyPattern * uWorleyMix;
    
    // Get color from palette
    vec3 color = getColourFromPalette(t);
    
    // Blend with dark grey for atmospheric effect
    vec3 darkGrey = vec3(0.06, 0.06, 0.06);
    color = mix(darkGrey, color, 0.9);
    
    // Apply dark vignette (controlled by uniforms)
    float vignetteAmount = darkVignette(centeredUv, uVignetteStrength);
    color *= vignetteAmount;
    
    gl_FragColor = vec4(color, 1.0);
}
