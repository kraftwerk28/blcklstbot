'use strict'

const { resolve } = require('path')
const WNE = require('webpack-node-externals')

module.exports = (env, { mode }) => ({
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
  devtool: mode === 'development' ? 'source-map' : false,
  plugins: [
  ],
  resolve: {
    extensions: ['.js']
  },
  externals: [WNE()]

})
