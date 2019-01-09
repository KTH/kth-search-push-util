'use strict'

const { required } = require('@kth/kth-validation')

const SearchPush = function ({log, batchSize, client, paths}) {
  required({log, client, paths})

  this.log = log
  this.batchSize = batchSize || 1
  this.client = client
  this.paths = paths

  this.batchPush = []
  this.batchDelete = []
}

SearchPush.prototype.flush = async function () {
  this.log.debug(`[SEARCH-PUSH-UTIL] Flushing`)

  // Flushing remaingin pages
  if (this.batchPush.length > 0) {
    await postBatch.call(this, this.batchPush.splice(0, this.batchPush.length))
  }

  // Flushing remaingin deletes
  if (this.batchDelete.length > 0) {
    await deleteBatch.call(this, this.batchDelete.splice(0, this.batchDelete.length))
  }
}

SearchPush.prototype.pushPage = async function (page) {
  this.batchPush.push(page)
  if (this.batchPush.length === this.batchSize) {
    await postBatch.call(this, this.batchPush.splice(0, this.batchSize))
  }
}

SearchPush.prototype.deletePage = async function (url) {
  required({ url })

  this.batchDelete.push(url)
  if (this.batchDelete.length === this.batchSize) {
    await deleteBatch.call(this, this.batchDelete.splice(0, this.batchSize))
  }
}
SearchPush.prototype.deletePages = async function (type, date) {
  required({type, date})

  this.log.debug(`[SEARCH-PUSH-UTIL] delete pages of type ${type} since date ${date}`)
  const res = await this.client.delAsync({uri: this.paths.deletePages.uri, body: { type, date }})
  this.log.info(`[SEARCH-PUSH-UTIL] deleted ${res.body.deleted} pages of type ${res.body.type}`)
}

const postBatch = async function (batch) {
  try {
    const res = await this.client.postAsync({uri: this.paths.postBatch.uri, body: batch})

    if (res.statusCode >= 400) {
      this.log.error(`[SEARCH-PUSH-UTIL] Could not push batch: ${res.body}`)
      handelBatchError.call(this, batch, 'error')
      return
    }

    this.log.debug(`[SEARCH-PUSH-UTIL] Pushed ${res.body.stored}/${res.body.total} pages`)

    handelBatchError.call(this, res.body.failed)
  } catch (e) {
    this.log.error(`Failed to push batch`, { err: e })
  }
}

const deleteBatch = async function (batch) {
  try {
    const res = await this.client.delAsync({uri: this.paths.deleteBatch.uri, body: batch})

    if (res.statusCode >= 400) {
      this.log.error(`[SEARCH-PUSH-UTIL] Could not delete batch: ${res.body}`)
      handelBatchError.call(this, batch, 'error')
      return
    }

    this.log.debug(`[SEARCH-PUSH-UTIL] Pushed ${res.body.stored}/${res.body.total} pages`)

    handelBatchError.call(this, res.body.failed)
  } catch (e) {
    this.log.error(`Failed to delete batch`, { err: e })
  }
} 

const handelBatchError = function (batch, type = 'warn') {
  batch.forEach(page => {
    this.log[type](`[SEARCH-PUSH-UTIL] Failed to push page (${page.title}) with url: ${page.url}`, page.error ? { err: JSON.stringify(page.error) } : '')
  }, this)
}

module.exports = SearchPush
