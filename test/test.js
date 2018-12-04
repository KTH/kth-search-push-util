/* eslint-env mocha */
const expect = require('chai').expect

const sinon = require('sinon')

const log = {
  error: sinon.fake(),
  warn: sinon.fake(),
  info: sinon.fake(),
  debug: sinon.fake()
}

const resetLog = () => Object.keys(log).forEach(key => { log[key] = sinon.fake() })

const standardConfig = {log: log, client: {}, paths: { 
  postBatch: { uri: 'postBatch.uri' },
  deletePage: { uri: 'deletePage.uri'},
  deletePages: { uri: 'deletePages.uri' }
} }

const { SearchPush } = require('../index')

describe('SearchPushUtil', () => {
  beforeEach(() => {
    resetLog()
  })

  it('should throw error on missing configuration', () => {
    let error
    try {
      new SearchPush({})
    } catch (err) {
      error = err
    }
    expect(error).to.not.be.undefined
  })
  it('should return a client when correct minimal configuration provided', () => {
    const util = new SearchPush(standardConfig)
    expect(util).to.not.be.undefined
    expect(typeof util.log).to.equal(typeof standardConfig.log)
    expect(typeof util.client).to.equal(typeof standardConfig.client)
    expect(typeof util.paths).to.equal(typeof standardConfig.paths)
  })

  it('should return a client configured batch size', () => {
    const config = {...standardConfig, batchSize: 100}
    const util = new SearchPush(config)
    expect(util).to.not.be.undefined
    expect(util.batchSize).to.equal(config.batchSize)
  })

  it('should handle a page push', (done) => {
    const util = new SearchPush(standardConfig)

    util.pushPage({url: 'kth.se'})
      .then(res => {
        expect(util.batch.length).to.equal(1)
        done()
      })
  })

  it('should handle a page push and batch call', (done) => {
    const paths = {
      postBatch: {
        uri: 'postBatch.uri'
      }
    }

    let postAsyncCalled = false

    const client = {
      postAsync: ({uri, body}) => {
        postAsyncCalled = true
        expect(uri).to.equal(paths.postBatch.uri)
        return Promise.resolve({
          statusCode: 200,
          body: {
            stored: 1,
            total: 1
          }
        })
      }
    }

    const config = {
      client,
      paths,
      log,
      batchSize: 1
    }
    
    const util = new SearchPush(config)

    util.pushPage({url: 'kth.se'})
      .then(res => {
        expect(util.batch.length).to.equal(0)
        expect(postAsyncCalled).to.be.true
        expect(log.debug.callCount).to.equal(1)
        done()
      })
  })

  it('should fail when batch size is to large', (done) => {
    const paths = {
      postBatch: {
        uri: 'postBatch.uri'
      }
    }

    let postAsyncCalled = false

    const client = {
      postAsync: ({uri, body}) => {
        postAsyncCalled = true
        expect(uri).to.equal(paths.postBatch.uri)
        return Promise.resolve({
          statusCode: 400
        })
      }
    }

    const config = {
      client,
      paths,
      log,
      batchSize: 1
    }

    const util = new SearchPush(config)

    util.pushPage({url: 'kth.se'})
      .then(res => {
        expect(util.batch.length).to.equal(0)
        expect(postAsyncCalled).to.be.true
        expect(log.error.callCount).to.equal(2)
        done()
      })
  })

  it('should log when one of pages in batch is incorrect', (done) => {
    const paths = {
      postBatch: {
        uri: 'postBatch.uri'
      }
    }

    let postAsyncCalled = false

    const client = {
      postAsync: ({uri, body}) => {
        postAsyncCalled = true
        expect(uri).to.equal(paths.postBatch.uri)
        return Promise.resolve({
          statusCode: 200,
          body: {
            stored: 0,
            total: 1,
            failed: [{title: 'Title', url: 'Url', error: 'Url is undefined'}]
          }
        })
      }
    }

    const config = {
      client,
      paths,
      log,
      batchSize: 1
    }

    const util = new SearchPush(config)

    util.pushPage({url: undefined})
      .then(res => {
        expect(util.batch.length).to.equal(0)
        expect(postAsyncCalled).to.be.true
        expect(log.debug.callCount).to.equal(1)
        expect(log.warn.callCount).to.equal(1)
        done()
      })
  })

  describe('Flush', () => {
    it('should not flush empty batch', () => {
      const fakePostAsync = sinon.fake()

      const util = new SearchPush({...standardConfig, client: { postAsync: fakePostAsync }})
      util.flush()
      expect(fakePostAsync.callCount).to.equal(0)
    })

    it('should flush batch', (done) => {
      const fakePostAsync = sinon.fake()

      const util = new SearchPush({...standardConfig, client: { postAsync: fakePostAsync }})
      util.pushPage({})
      util.flush()
        .then(() => {
          expect(fakePostAsync.callCount).to.equal(1)
          done()
        })
    })
  })

  describe('deletePage', () => {
    it('should fail when required field is missing', async () => {
      const util = new SearchPush(standardConfig)

      let error
      try {
        await util.deletePage()
      } catch (e) {
        error = e
      }
      expect(error).to.not.be.undefined
    })

    it('should delete one', (done) => {
      const fakeDelAsync = sinon.fake()

      const util = new SearchPush({...standardConfig, client: { delAsync: fakeDelAsync }})

      util.deletePage({ url: 'test'}).then(() => {
        expect(fakeDelAsync.callCount).to.equal
        done()
      })
    })
  })

  describe('DeletePages', () => {
    it('should fail when required field is missing', async () => {
      const util = new SearchPush(standardConfig)

      let error
      try {
        await util.deletePages()
      } catch (e) {
        error = e
      }
      expect(error).to.not.be.undefined
    })

    it('should delete pages', (done) => {
      const fakeDelAsync = sinon.fake()

      const util = new SearchPush({...standardConfig, client: { delAsync: fakeDelAsync }})

      util.deletePage({ type: 'test', date: 'testDate'}).then(() => {
        expect(fakeDelAsync.callCount).to.equal
        done()
      })
    })
  })
})

