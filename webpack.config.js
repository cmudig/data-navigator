const path = require('path');

module.exports = {
  entry: {
    'index': './src/data-navigator.ts',
    'input': './src/input.ts',
    'rendering': './src/rendering.ts',
    'structure': './src/structure.ts',
    'utilities': './src/utilities.ts',
    'v-bundle': './examples/vega-lite-app.js',
    'static-bundle': './examples/static-app.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  resolve: {
    extensions: ["", ".webpack.js", ".web.js", ".ts", ".tsx", ".js"],
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: "ts-loader" },
      { test: /\.js$/, loader: "source-map-loader" },
    ],
  },
  optimization: {
    minimize: true
  },
};