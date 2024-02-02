/**
 * Used in local environment:
 *   Request proxy to rewrite URLs and prevent CORS errors
 */
const logFn = function (req, res) {
  //console.log(new Date().toISOString() + `: bypassing ${req.method} ${req.url} `)
}
const bypassFn = function (req, res) {
  logFn(req, res)
  if (req.method.toUpperCase() === 'OPTIONS') {
    res.setHeader('Allow', 'GET, POST, HEAD, PUT, DELETE, OPTIONS')
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', '*')
    res.setHeader('Access-Control-Allow-Headers', '*')
    return res.send('')
  }
}

const PROXY_CONFIG = {
  '/portal-api': {
    target: 'http://tkit-portal-server',
    pathRewrite: { '^.*/portal-api': '' },
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: bypassFn
  },
  '/ahm-api': {
    target: 'http://ahm',
    pathRewrite: { '^.*/ahm-api': '' },
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
    bypass: logFn
  }
}

module.exports = PROXY_CONFIG
