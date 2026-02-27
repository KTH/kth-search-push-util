"use strict";

const log = {
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
};

const resetLog = () =>
  Object.keys(log).forEach((key) => {
    log[key] = jest.fn();
  });

const standardConfig = {
  log: log,
  client: {},
  paths: {
    postBatch: { uri: "postBatch.uri" },
    deletePage: { uri: "deletePage.uri" },
    deletePages: { uri: "deletePages.uri" },
    deleteBatch: { uri: "deleteBatch.uri" },
  },
};

const { SearchPush } = require("../index");

describe("SearchPushUtil", () => {
  beforeEach(() => {
    resetLog();
  });

  it("should throw error on missing configuration", () => {
    expect(() => new SearchPush({})).toThrow();
  });

  it("should return a client when correct minimal configuration provided", () => {
    const util = new SearchPush(standardConfig);
    expect(util).toBeDefined();
    expect(typeof util.log).toBe(typeof standardConfig.log);
    expect(typeof util.client).toBe(typeof standardConfig.client);
    expect(typeof util.paths).toBe(typeof standardConfig.paths);
  });

  it("should return a client configured batch size", () => {
    const config = { ...standardConfig, batchSize: 100 };
    const util = new SearchPush(config);
    expect(util).toBeDefined();
    expect(util.batchSize).toBe(config.batchSize);
  });

  it("should handle a page push", async () => {
    const util = new SearchPush(standardConfig);

    await util.pushPage({ url: "kth.se" });
    expect(util.batchPush.length).toBe(0);
  });

  it("should handle a page push and batch call", async () => {
    const paths = {
      postBatch: {
        uri: "postBatch.uri",
      },
    };

    let postAsyncCalled = false;

    const client = {
      postAsync: ({ uri, body }) => {
        postAsyncCalled = true;
        expect(uri).toBe(paths.postBatch.uri);
        return Promise.resolve({
          statusCode: 200,
          body: {
            stored: 1,
            total: 1,
          },
        });
      },
    };

    const config = {
      client,
      paths,
      log,
      batchSize: 1,
    };

    const util = new SearchPush(config);

    await util.pushPage({ url: "kth.se" });
    expect(util.batchPush.length).toBe(0);
    expect(postAsyncCalled).toBe(true);
    expect(log.debug.mock.calls.length).toBe(1);
  });

  it("should fail when batch size is to large", async () => {
    const paths = {
      postBatch: {
        uri: "postBatch.uri",
      },
    };

    let postAsyncCalled = false;

    const client = {
      postAsync: ({ uri, body }) => {
        postAsyncCalled = true;
        expect(uri).toBe(paths.postBatch.uri);
        return Promise.resolve({
          statusCode: 400,
        });
      },
    };

    const config = {
      client,
      paths,
      log,
      batchSize: 1,
    };

    const util = new SearchPush(config);

    await util.pushPage({ url: "kth.se" });
    expect(util.batchPush.length).toBe(0);
    expect(postAsyncCalled).toBe(true);
    expect(log.error.mock.calls.length).toBe(2);
  });

  it("should log when one of pages in batch is incorrect", async () => {
    const paths = {
      postBatch: {
        uri: "postBatch.uri",
      },
    };

    let postAsyncCalled = false;

    const client = {
      postAsync: ({ uri, body }) => {
        postAsyncCalled = true;
        expect(uri).toBe(paths.postBatch.uri);
        return Promise.resolve({
          statusCode: 200,
          body: {
            stored: 0,
            total: 1,
            failed: [{ title: "Title", url: "Url", error: "Url is undefined" }],
          },
        });
      },
    };

    const config = {
      client,
      paths,
      log,
      batchSize: 1,
    };

    const util = new SearchPush(config);

    await util.pushPage({ url: undefined });
    expect(util.batchPush.length).toBe(0);
    expect(postAsyncCalled).toBe(true);
    expect(log.debug.mock.calls.length).toBe(1);
    expect(log.warn.mock.calls.length).toBe(1);
  });

  describe("Flush", () => {
    it("should not flush empty batch", () => {
      const fakePostAsync = jest.fn();

      const util = new SearchPush({
        ...standardConfig,
        client: { postAsync: fakePostAsync },
      });
      util.flush();
      expect(fakePostAsync.mock.calls.length).toBe(0);
    });

    it("should flush batch", async () => {
      const fakePostAsync = jest.fn();

      const util = new SearchPush({
        ...standardConfig,
        client: { postAsync: fakePostAsync },
      });
      util.pushPage({});
      await util.flush();
      expect(fakePostAsync.mock.calls.length).toBe(1);
    });

    it("should flush both delete and push batches", async () => {
      const fakePostAsync = jest.fn();
      const fakeDelAsync = jest.fn();

      const util = new SearchPush({
        ...standardConfig,
        batchSize: 10,
        client: { postAsync: fakePostAsync, delAsync: fakeDelAsync },
      });
      util.pushPage({});
      util.deletePage("test");

      await util.flush();
      expect(fakePostAsync.mock.calls.length).toBe(1);
      expect(fakeDelAsync.mock.calls.length).toBe(1);
    });

    it("should flush only the batch with content", async () => {
      const fakePostAsync = jest.fn();
      const fakeDelAsync = jest.fn();

      const util = new SearchPush({
        ...standardConfig,
        client: { postAsync: fakePostAsync, delAsync: fakeDelAsync },
      });
      util.pushPage({});
      await util.flush();
      expect(fakePostAsync.mock.calls.length).toBe(1);
      expect(fakeDelAsync.mock.calls.length).toBe(0);
    });
  });

  describe("deletePage", () => {
    it("should fail when required field is missing", async () => {
      const util = new SearchPush(standardConfig);

      await expect(util.deletePage()).rejects.toThrow();
    });

    it("should delete one", async () => {
      const fakeDelAsync = jest.fn();

      const util = new SearchPush({
        ...standardConfig,
        client: { delAsync: fakeDelAsync },
      });

      await util.deletePage({ url: "test" });
      expect(fakeDelAsync.mock.calls.length).toBeDefined();
    });

    it("should delete batch of 10", async () => {
      const paths = {
        deleteBatch: {
          uri: "postBatch.uri",
        },
      };

      let delAsyncCalled = false;

      const client = {
        delAsync: ({ uri, body }) => {
          delAsyncCalled = true;
          expect(uri).toBe(paths.deleteBatch.uri);
          return Promise.resolve({
            statusCode: 200,
            body: {
              removed: 1,
              total: 1,
            },
          });
        },
      };

      const config = {
        client,
        paths,
        log,
        batchSize: 10,
      };

      const util = new SearchPush(config);

      for (let i = 0; i < 9; i++) {
        util.deletePage({ url: "kth.se" });
      }

      await util.deletePage({ url: "kth.se" });
      expect(util.batchDelete.length).toBe(0);
      expect(delAsyncCalled).toBe(true);
      expect(log.debug.mock.calls.length).toBe(1);
    });
  });

  describe("DeletePages", () => {
    it("should fail when required field is missing", async () => {
      const util = new SearchPush(standardConfig);

      await expect(util.deletePages()).rejects.toThrow();
    });

    it("should delete pages", async () => {
      const fakeDelAsync = jest.fn();

      const util = new SearchPush({
        ...standardConfig,
        client: { delAsync: fakeDelAsync },
      });

      await util.deletePage({ type: "test", date: "testDate" });
      expect(fakeDelAsync.mock.calls.length).toBeDefined();
    });
  });
});
