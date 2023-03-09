/** @type {import('next').NextConfig} */
const nextConfig = {
  swcMinify: true,
  reactStrictMode: true,
  experimental: {
    fontLoaders: [
      {
        loader: "@next/font/google",
        options: { subsets: ["latin"] },
      },
    ],
    appDir: true,
  },
  async rewrites() {
    return [
      {
        source: '/@:username',
        destination: '/profile/:username'
      }
    ]
  }
}

export default nextConfig
