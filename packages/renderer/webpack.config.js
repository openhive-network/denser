'use strict';

const Visualizer = require('webpack-visualizer-plugin2');

const path = require('path');
const webpack = require('webpack');

const DEFAULTS = {
    isDevelopment: process.env.NODE_ENV !== 'production',
    baseDir: path.join(__dirname, '..'),
};

module.exports = {
    mode: (DEFAULTS.isDevelopment ? "development" : "production"),
    entry: "./src/index.ts",
    output: {
        path: path.resolve(__dirname, "dist", "browser"),
        filename: "hive-content-renderer.min.js",
        library: "HiveContentRenderer",
        libraryTarget: "umd",
        globalObject: 'this'
    },
    devtool: (DEFAULTS.isDevelopment ? 'eval-cheap-source-map' : false),
    target: "web",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: [
                    {
                        loader: 'ts-loader',
                        options: {
                            configFile: 'tsconfig.build.json',
                            transpileOnly: true,
                            compilerOptions: {
                                module: 'esnext'
                            }
                        }
                    }
                ],
                exclude: /node_modules/
            }
        ]
    },
    optimization: {
        minimize: (!DEFAULTS.isDevelopment)
    },
    performance: {
        hints: false
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js', '.json'],
        fallback: {
            "fs": false,
            "url": false
        }
    },
    plugins: [
        new Visualizer({
            filename: './statistics.html'
        }),
        new webpack.DefinePlugin({
            'process.env': (process.env.NODE_ENV === 'production') ? {
              NODE_ENV: '"production"'
            } : {
              NODE_ENV: '"development"'
            },
            "_WEBPACK_BUILD": JSON.stringify(true),
          }),
    ]
}
