/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      {
        source: '/',
        destination: '/trending',
        permanent: true,
      },
    ]
  },
}

export default nextConfig
