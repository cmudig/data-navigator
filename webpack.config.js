import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const config = {
  entry: {
    'v-bundle': './examples/vega-lite-app.js',
    'static-bundle': './examples/static-app.js',
    'testing-bundle': './examples/testing-environment.js',
    'docs': './examples/docs.js',
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
export default config