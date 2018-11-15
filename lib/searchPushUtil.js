'use strict'

const { required } = require('@kth/kth-validation')

const SearchPush = function ({log, batchSize, client, paths}) {
  required({log, client, paths})

  this.log = log
  this.batchSize = batchSize || 10
  this.client = client
  this.paths = paths

  this.batch = []
}

SearchPush.prototype.flush = async function () {
  if (this.batch.length > 0) {
    this.log.debug(`[SEARCH-PUSH] Flushing`)
    await postBatch.call(this, this.batch.splice(0, this.batch.length))
  }
}

SearchPush.prototype.pushPage = async function (page) {
  this.batch.push(page)
  if (this.batch.length === this.batchSize) {
    await postBatch.call(this, this.batch.splice(0, this.batchSize))
  }
}

SearchPush.prototype.deleteOne = async function (url) {
  required({ url })

  this.log.debug(`[SEARCH PUSH API] delete page: ${url}`)
  return this.client.delAsync({uri: this.paths.deletePage.uri, body: { url: url }})
}

SearchPush.prototype.deletePages = async function (type, date) {
  required({type, date})

  this.log.debug(`[SEARCH PUSH API] delete pages of type ${type} since date ${date}`)
  return this.client.delAsync({uri: this.paths.deletePages.uri, body: { type, date }})
}

const postBatch = async function (batch) {
  try {
    const res = await this.client.postAsync({uri: this.paths.postBatch.uri, body: batch})

    if (res.statusCode >= 400) {
      this.log.error(`[SEARCH-PUSH-ERROR] Could not push batch: ${res.body}`)
      handelBatchError.call(this, batch, 'error')
      return
    }

    this.log.debug(`[SEARCH-PUSH] Pushed ${res.body.stored}/${res.body.total} pages`)

    handelBatchError.call(this, res.body.failed)
  } catch (e) {
    this.log.error(`Failed to push batch`, { err: e })
  }
}

const handelBatchError = function (batch, type = 'warn') {
  batch.forEach(page => {
    this.log[type](`[SEARCH-PUSH-${type.toUpperCase()}] Failed to push page (${page.title}) with url: ${page.url}`, page.error ? { err: JSON.stringify(page.error) } : '')
  }, this)
}

module.exports = SearchPush
