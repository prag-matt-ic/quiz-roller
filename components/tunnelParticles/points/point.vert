uniform sampler2D uPositions;
uniform float uTime;
uniform float uDpr;

attribute float seed;

varying float vLife;
varying float vSeed;

// Increased sizes for better visibility
const float MIN_PT_SIZE = 12.0;
const float LG_PT_SIZE = 56.0;
const float XL_PT_SIZE = 112.0;

void main() {
    // DPR adjusted point sizes (ensuring uniformity across devices)
    float minPtSize = MIN_PT_SIZE * uDpr;
    float lgPtSize = LG_PT_SIZE * uDpr;
    float xlPtSize = XL_PT_SIZE * uDpr;

    vec4 positionData = texture2D(uPositions, uv);
    vec3 pos = positionData.xyz;
    float life = positionData.w;
    
    vLife = life;
    vSeed = seed;
    
    vec4 modelPosition = modelMatrix * vec4(pos, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    gl_Position = projectedPosition;
    
    // Dynamic point size based on seed and distance from camera
    // Use modulated seed to distribute XL particles throughout the range
    float modulatedSeed = fract(seed * 10.0); // Multiply and modulate to spread distribution
    float stepSeed = step(0.9, modulatedSeed); // Some of the points will be XL size
    float size = mix(mix(minPtSize, lgPtSize, modulatedSeed), xlPtSize, stepSeed); // Random size based on seed

    float attenuationFactor = 1.0 / max(-viewPosition.z, 1.0); // Size attenuation (get smaller as distance increases)
    float pointSize = size * attenuationFactor;

    gl_PointSize = pointSize;
}
