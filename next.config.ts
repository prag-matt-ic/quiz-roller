import path from 'path'
import type { NextConfig } from 'next'

const envOrigins =
  process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean) ?? []

const localNetworkOrigins = ['192.168.1.118']

const allowedDevOrigins = Array.from(new Set([...localNetworkOrigins, ...envOrigins]))

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  reactCompiler: false,
  allowedDevOrigins,
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
