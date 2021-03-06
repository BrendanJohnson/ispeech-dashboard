const path = require('path');
const webpack = require('webpack');

function resolveSrc(_path) {
  return path.join(__dirname, _path);
}

module.exports = {
  // publicPath: process.env.NODE_ENV === 'production'
  //   ? '/ispeech-dashboard/'
  //   : '/',
  lintOnSave: false,
  configureWebpack: {
    // Set up all the aliases we use in our app.
    resolve: {
      alias: {
        src: resolveSrc('src'),
        'chart.js': 'chart.js/dist/Chart.js'
      }
    },
    plugins: [
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 6
      })
    ]
  },
  devServer: {
    proxy: {
            '/audio': {
                target:'https://storage.googleapis.com/ispeech-bucket/raw_audio',
                changeOrigin: true,
                pathRewrite: {'^/audio' : ''}
            },
            '/NLP': {
                target:'http://localhost:3000/',
                port: 3000,
                changeOrigin: true
            }
    }
  },
  pwa: {
    name: 'iSpeech Dashboard',
    themeColor: '#344675',
    msTileColor: '#344675',
    appleMobileWebAppCapable: 'yes',
    appleMobileWebAppStatusBarStyle: '#344675'
  },
  css: {
    // Enable CSS source maps.
    sourceMap: process.env.NODE_ENV !== 'production'
  }
};
