/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    GREETING: "Hello World",
  },
  async redirects() {
    return [
      {
        source: '/',
        destination: '/trending',
        permanent: true
      }
    ];
  }
};

module.exports = nextConfig;
