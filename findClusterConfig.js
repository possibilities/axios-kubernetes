const https = require('https')
const { readFileSync } = require('fs')

const host = process.env.KUBERNETES_SERVICE_HOST
const port = process.env.KUBERNETES_SERVICE_PORT

const caPath = '/var/run/secrets/kubernetes.io/serviceaccount/ca.crt'
const tokenPath = '/var/run/secrets/kubernetes.io/serviceaccount/token'

const findClusterConfig = () => {
  const ca = readFileSync(caPath, 'utf8')
  const bearer = readFileSync(tokenPath, 'utf8')

  return {
    baseURL: `https://${host}:${port}`,
    httpsAgent: new https.Agent({ ca }),
    headers: { authorization: `Bearer ${bearer}` }
  }
}

module.exports = findClusterConfig
