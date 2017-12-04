const axios = require('axios')
const JSONStream = require('JSONStream')
const { EventEmitter } = require('events')
const configureDebug = require('debug')

const debug = configureDebug('axios-kubernetes')

const WATCH_TIMEOUT_SECONDS = 60

// Given a client and a URL
const streamItems = async (client, vent, url, resourceVersion, options) => {
  const initialFetchOptions = {
    ...options,
    params: { continue: resourceVersion }
  }

  debug('initial fetch %O', initialFetchOptions)
  const { data } = await client.get(url, initialFetchOptions)

  debug('recording initial resource version %s', resourceVersion)
  resourceVersion = data.metadata.resourceVersion

  const watchOptions = {
    ...options,
    responseType: 'stream',
    params: {
      watch: 'true',
      resourceVersion,
      timeoutSeconds: WATCH_TIMEOUT_SECONDS
    }
  }

  debug('watching %O', watchOptions)
  return client.get(url, watchOptions)
    .then(async response => {
      const stream = response.data.pipe(JSONStream.parse())
      stream.on('data', item => {
        debug('item received %O', item)
        // Send an event based on the item type, e.g. if the `type` is
        // `ADDED` then the event name with be `item:added`.
        vent.emit(`item:${item.type.toLowerCase()}`, { data: item.object })
        // Keep track of the last fetched version
        debug('recording latest resource version %s', resourceVersion)
        resourceVersion = item.object.metadata.resourceVersion
      })
      // Let the outside world know about disconnection to enable reconnect
      stream.on('end', () => {
        debug('disconnecting at resource version %s', resourceVersion)
        vent.emit('disconnect', resourceVersion)
      })
      stream.on('error', error => {
        debug('error %O', error)
        vent.emit('error', error)
      })
    })
    .catch(error => console.error(error.response.data))
}

// Given an axios client watch a URL forever
const watchForClient = client => (url, options = {}) => {
  debug('creating watch for client')
  const vent = new EventEmitter()

  // // The connection drops periodically
  vent.on('disconnect', resourceVersion => {
    debug('disconnected at resource version %s, reconnecting', resourceVersion)
    // Renew the stream
    streamItems(client, vent, url, resourceVersion, options)
  })

  // Start initial stream
  debug('connecting')
  streamItems(client, vent, url, 0, options)
  return vent
}

// Build up a version of `axios.create` that returns an instance with a
// `watch` method.
const axiosCreateWithWatch = config => {
  debug('create %O', config)
  const client = axios.create(config)
  const watch = watchForClient(client)
  return { ...client, watch }
}

// Put it together so the interface axios-like
const axiosKubernetes = watchForClient(axios)
axiosKubernetes.create = axiosCreateWithWatch

module.exports = axiosKubernetes
