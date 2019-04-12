'use strict'

const { resolve } = require('path')

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
        test: /\.ts$/,
        loader: 'ts-loader'
      }
    ]
  },
  plugins: [
    // new DefinePlugin({
    //   NODE_ENV: JSON.stringify(mode)
    // })
  ],
  resolve: {
    extensions: ['.ts']
  }

})
