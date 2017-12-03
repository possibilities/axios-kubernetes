const axios = require('axios')
const JSONStream = require('JSONStream')
const { EventEmitter } = require('events')

const streamItems = async (client, vent, url, options) => {
  return client.get(url, { ...options, responseType: 'stream' })
    .then(({ data }) => {
      const stream = data.pipe(JSONStream.parse())
      stream.on('data', item => {
        vent.emit('item', { data: item })
        vent.emit(`item:${item.type.toLowerCase()}`, { data: item.object })
      })
      stream.on('end', () => vent.emit('disconnect'))
    })
    .catch(error => console.error(error.response.data))
}

const watchForClient = client => (url, options) => {
  const vent = new EventEmitter()

  vent.on('disconnect', () => streamItems(client, vent, url, options))
  streamItems(client, vent, url, options)

  return vent
}

const axiosCreateWithWatch = config => {
  const client = axios.create(config)
  const watch = watchForClient(client)
  return { ...client, watch }
}

const axiosKubernetes = watchForClient(axios)
axiosKubernetes.create = axiosCreateWithWatch

module.exports = axiosKubernetes
