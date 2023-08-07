const path = require('path');

module.exports = {
  entry: {
    'index': './src/data-navigator.js',
    'input': './src/input.js',
    'rendering': './src/rendering.js',
    'structure': './src/structure.js',
    'utilities': './src/utilities.js',
    'v-bundle': './examples/vega-lite-app.js',
    'static-bundle': './examples/static-app.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    minimize: false
  },
};