const path = require('path')
const withTM = require('next-transpile-modules')(["@hive/ui"])
const { GitRevisionPlugin } = require('git-revision-webpack-plugin')
const gitRevisionPlugin = new GitRevisionPlugin({
  versionCommand: 'describe --always --tags --dirty',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '../..'),
  },
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = { fs: false };
    }
    config.plugins = config.plugins || [];
    config.plugins.push(gitRevisionPlugin);
    config.plugins.push(
      new webpack.DefinePlugin({
        GIT_VERSION: JSON.stringify(gitRevisionPlugin.version()),
        GIT_COMMITHASH: JSON.stringify(gitRevisionPlugin.commithash()),
        GIT_BRANCH: JSON.stringify(gitRevisionPlugin.branch()),
        GIT_LASTCOMMITDATETIME: JSON.stringify(gitRevisionPlugin.lastcommitdatetime()),
      })
    );

    return config;
  }
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true'
});
module.exports = withTM(withBundleAnalyzer(nextConfig));
