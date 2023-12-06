const path = require('path')
const withTM = require('next-transpile-modules')(["@hive/ui"])
const version = require('./version.json');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..'),
  },
  async rewrites() {
    return [
      {
        source: '/.well-known/openid-configuration',
        destination: '/api/oidc/.well-known/openid-configuration',
      },
      // {
      //   source: '/interaction/:path*',
      //   destination: '/api/oidc/interaction/:path*',
      // },
      {
        source: '/oidc/:path*',
        destination: '/api/oidc/:path*',
      },
    ]
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false };
    }
    config.plugins = config.plugins || [];
    config.plugins.push(
      new webpack.DefinePlugin({
        GIT_BRANCH: JSON.stringify(version.branch),
        GIT_COMMITHASH: JSON.stringify(version.commithash),
        GIT_VERSION: JSON.stringify(version.version)
      })
    );

    return config;
  }
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});
module.exports = withTM(withBundleAnalyzer(nextConfig));
