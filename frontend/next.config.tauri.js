/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,

  // Static export doesn't support image optimization
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatar.vercel.sh',
      },
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
    ],
  },

  transpilePackages: ['@phosphor-icons/react'],

  experimental: {
    optimizePackageImports: ['@phosphor-icons/react'],
  },
};

module.exports = nextConfig;
