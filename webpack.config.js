'use strict'

const { resolve } = require('path')
const WebpackNodeExt = require('webpack-node-externals')

module.exports = (env, { mode }) => {
  const dev = mode === 'development'

  return {
    mode,
    target: 'node',
    entry: '.',
    output: {
      filename: 'index.js',
      path: resolve('dist/'),
    },
    stats: 'minimal',
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader'
        }
      ]
    },
    devtool: dev ? 'source-map' : false,
    resolve: {
      extensions: ['.js']
    },
    externals: [WebpackNodeExt()]
  }
}
