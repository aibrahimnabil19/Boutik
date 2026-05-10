/** @type {import('next').NextConfig} */
const isNativeBuild = process.env.NEXT_PUBLIC_NATIVE_BUILD === 'true'

const nextConfig = {
  ...(isNativeBuild ? { output: 'export' } : {}),

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
    ...(isNativeBuild ? { unoptimized: true } : {}),
  },

  ...(isNativeBuild ? { trailingSlash: true } : {}),
}

module.exports = nextConfig