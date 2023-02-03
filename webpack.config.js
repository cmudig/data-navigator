const path = require('path');

module.exports = {
  entry: './src/interaction-handler.js',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
};