# Axios Kubernetes

Axios client with niceties for Kubernetes

## Features

* `watch` verb for streaming results
* `findClusterConfig` helper for authenticating inside a kubernetes-deployed container

## API

#### `axios.watch()`

#### `axios#watch()`

##### Events

* `item:added`
* `item:deleted`
* `item:modified`
* `disconnect`

#### `findClusterConfig()`
