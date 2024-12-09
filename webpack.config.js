const path = require('path');

module.exports = {
  entry: {
    'v-bundle': './examples/vega-lite-app.js',
    'static-bundle': './examples/static-app.js',
    'testing-bundle': './examples/testing-environment.js',
    'vis': './examples/vis-demo.js'
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'app'),
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