/**
 * Apply a rectangular gradient band with optional border on top of the base color.
 *
 * @param baseColor - The existing color buffer to blend with
 * @param uv - Unmodified UV coordinates
 * @param resolution - Render resolution for pixel-accurate borders
 * @param a,b,c,d - Cosine palette parameters
 * @return vec3 - Blended color with band overlay
 */
vec3 applyGradientBand(vec3 baseColor, vec2 uv, vec2 resolution, vec3 a, vec3 b, vec3 c, vec3 d) {
    const float bandWidth = 0.4;
    const float bandHeight = 0.12;
    const float bandStartX = 0.5 - bandWidth * 0.5;
    const float bandEndX = 0.5 + bandWidth * 0.5;
    const float bandStartY = 0.5 - bandHeight * 0.5;
    const float bandEndY = 0.5 + bandHeight * 0.5;

    float linearT = clamp((uv.x - bandStartX) / bandWidth, 0.0, 1.0);
    vec3 linearColour = clamp(a + b * cos(6.283185 * (c * linearT + d)), 0.0, 1.0);

    float insideX = step(bandStartX, uv.x) * step(uv.x, bandEndX);
    float insideY = step(bandStartY, uv.y) * step(uv.y, bandEndY);
    float bandMask = insideX * insideY;

    const float pixelBorder = 1.0;
    float borderThicknessX = pixelBorder / max(resolution.x, 1.0);
    float borderThicknessY = pixelBorder / max(resolution.y, 1.0);

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

#pragma glslify: export(applyGradientBand)
