const path = require('path');

module.exports = {
  entry: {
    bundle: './src/app.js', 
    'v-bundle': './src/vega-lite-app.js',
    'static-bundle': './src/static-app.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
};