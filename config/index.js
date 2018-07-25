module.exports = {
  build: {
    env: require('./prod.env'),
    assetsSubDirectory: 'static',
    assetsPublicPath: '/'
  },
  dev: {
    env: require('./dev.env'),
    port: {
      'http': 9088,
      'https': 9446
    },
    autoOpenBrowser: true,
    proxyTable: {
    },
  }
}
