import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: false,
  devIndicators: false,
  // Configure Turbopack to recognize and transform GLSL shader files
  // when running `next dev --turbopack` or `next build --turbopack`.
  // This mirrors the webpack rule below but uses Turbopack's loader API.
  turbopack: {
    rules: {
      '*.glsl': { loaders: ['raw-loader', 'glslify-loader'], as: '*.js' },
      '*.vert': { loaders: ['raw-loader', 'glslify-loader'], as: '*.js' },
      '*.frag': { loaders: ['raw-loader', 'glslify-loader'], as: '*.js' },
      '*.vs': { loaders: ['raw-loader', 'glslify-loader'], as: '*.js' },
      '*.fs': { loaders: ['raw-loader', 'glslify-loader'], as: '*.js' },
    },
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.(glsl|vs|fs|vert|frag)$/,
      use: ['raw-loader', 'glslify', 'glslify-loader'],
    })
    return config
  },
}

export default nextConfig
