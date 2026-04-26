/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
    ],
  },
  // Uncomment when you want static export for Tauri desktop:
  // output: 'export',
}

module.exports = nextConfig