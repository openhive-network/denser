const path = require('path')
const withTM = require('next-transpile-modules')(["@hive/ui"])
const version = require('./version.json');
const CopyPlugin = require('copy-webpack-plugin');

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

    // copy hb-auth worker.js
    config.plugins.push(new CopyPlugin({
      patterns: [{
        from: path.join(__dirname, '../../node_modules/@hive/hb-auth/dist/worker.js'),
        to: path.join(__dirname, 'public/auth/')
      }]
    }));

    return config;
  }
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});
module.exports = withTM(withBundleAnalyzer(nextConfig));
