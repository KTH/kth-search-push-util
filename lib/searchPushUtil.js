'use strict'

const { required } = require('@kth/kth-validation')

const SearchPush = function (opts) {
  required(opts)

  this.log = opts.log
  this.batchSize = opts.batchSize || 10
  this.client = opts.client
  this.paths = opts.paths

  this.batch = []
}

SearchPush.prototype.flush = function () {
  this.log.debug(`[SEARCH-PUSH] Pushed last ${this.batch.length} rooms`)
  return postBatch.call(this, this.batch.splice(0, this.batch.length))
}

SearchPush.prototype.postPage = async function (page) {
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

    if (res.statusCode === 400) {
      this.log.error(`[SEARCH-PUSH-ERROR] Could not push batch: ${res.body}`)
      handelBatchError(batch, 'error')
      return
    }

    this.log.debug(`[SEARCH-PUSH] Pushed ${res.body.stored}/${res.body.total} rooms`)

    handelBatchError.call(this, res.body.failed)
  } catch (e) {
    this.log.error(`Failed to push batch`, { err: e })
  }
}

const handelBatchError = function (batch, type = 'warn') {
  batch.forEach(page => {
    this.log[type](`[SEARCH-PUSH-${type.toUpperCase()}] Failed to push room (${page.title}) with url: ${page.url}`, page.error ? { err: JSON.stringify(page.error) } : '')
  }, this)
}

module.exports = SearchPush
