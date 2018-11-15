# kth-search-push-util

Utils to simplifie pushing information to KTH:s search solution

### Examples

```javascript
const log = require('kth-node-log')
const { SearchPush } = require('@kth/kth-node-search-push-util')

const config = {
  log: log,
  client: api.client,
  paths: api.paths,
  batchSize: 10
}

const util = new SearchPush(config)

const import = async (pages) => {
  for (let page of pages) {
    await util.pushPage(page)
  }

  await util.flush()

  await cleanup()
}

const cleanup = () => {
  return util.deletePages('type', new Date())
}

```