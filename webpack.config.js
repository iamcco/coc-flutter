const path = require('path');

/** @type {import('webpack').Configuration} */
module.exports = {
  entry: './src/index.ts',
  target: 'node',
  mode: 'production',
  resolve: {
    mainFields: ['module', 'main'],
    extensions: ['.js', '.ts'],
  },
  externals: {
    'coc.nvim': 'commonjs coc.nvim',
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
          },
        ],
      },
    ],
  },
  output: {
    path: path.join(__dirname, 'out'),
    filename: 'index.js',
    libraryTarget: 'commonjs',
  },
  plugins: [],
  node: {
    __dirname: false,
    __filename: false,
  },
};
