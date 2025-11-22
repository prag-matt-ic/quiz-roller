import path from 'path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  reactCompiler: true,
  experimental: {
    cssChunking: true,
  },
  // Configure Turbopack to recognize and transform GLSL shader files.
  // These rules replace the legacy webpack loader setup from pre-v16.
  turbopack: {
    root: path.join(__dirname),
    rules: {
      '*.glsl': { loaders: ['raw-loader', 'glslify-loader'], as: '*.js' },
      '*.vert': { loaders: ['raw-loader', 'glslify-loader'], as: '*.js' },
      '*.frag': { loaders: ['raw-loader', 'glslify-loader'], as: '*.js' },
      '*.vs': { loaders: ['raw-loader', 'glslify-loader'], as: '*.js' },
      '*.fs': { loaders: ['raw-loader', 'glslify-loader'], as: '*.js' },
    },
  },
}

export default nextConfig
