/**
 * 友账表
 * - 编译生成index.html
 * - 编译生成混淆压缩后的js
 */

const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const moment = require('moment');
const childProcess = require('child_process');

const packageJSON = require('./package.json');

// 获取版本
const GIT_REVISION = childProcess.execSync('git rev-parse HEAD').toString().trim();

module.exports = {
  entry: [
    './src/index-yzb'
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.min.js' // Template based on keys in entry above
  },
  plugins: [
    new webpack.optimize.CommonsChunkPlugin('common.min.js'),
    /**
     * This plugin assigns the module and chunk ids by occurence count. What this
     * means is that frequently used IDs will get lower/shorter IDs - so they become
     * more predictable.
     */
    new webpack.optimize.OccurenceOrderPlugin(),
    /**
     * See description in 'webpack.config.dev' for more info.
     */
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify('production')
      }
    }),
    new HtmlWebpackPlugin({
      title: `友账表 v${packageJSON.version}`,
      filename: 'index.html',
      template: 'client/index-yzb.hbs',
      hash: true,
      // User defined options
      version: packageJSON.version,
      revision: GIT_REVISION,
      buildTime: moment().format('YYYY-MM-DD HH:mm:ss')
    }),
    new webpack.optimize.UglifyJsPlugin({
      minimize: true,
      compress: {
        warnings: false
      }
    })
  ],
  module: {
    loaders: [
      {
        test: /\.js$/,
        exclude: [/node_modules/, /styles/],
        loaders: ['babel'],
        include: path.join(__dirname, 'src')
      },
      {
        test: /\.css$/,
        loader: 'style-loader!css-loader'
      },
      {
        test: /\.less$/,
        loader: 'style-loader!css-loader!less-loader'
      },
      {
        test: /\.(png|jpg|bmp)$/,
        loader: 'url-loader?limit=8192'
      },
      {
        test: /\.hbs$/,
        loader: 'handlebars-loader'
      }
    ]
  }
};

/**
 * References
 * 同时编译minified和uncompressed版本
 * http://stackoverflow.com/a/34018909/4685522
 */
