import { assert } from "chai";
import Server from "../../src/server/server-impl";
import { loadPage } from "./server-impl.test";

let server: Server;
let port: number;

describe("server: routing", () => {

  before((done) => {
    server = new Server({
      rootPath: process.cwd() + '/test/server/routing',
      clientJsFilePath: process.cwd() + '/dist/client.js',
      mute: true,
      pageLimit: { maxRequests: 1000, windowMs: 1000 }
    }, (portNr) => {
      port = portNr;
      done();
    });
  });

  after(async () => {
    return server.close();
  });

  it(`should support routing for app1 ('index.html')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/index.html?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'index: /app1/index.html|/app1/|index.html|');
  });

  it(`should support routing for app1 ('index')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/index?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'index: /app1/index|/app1/|index.html|');
  });

  it(`should support routing for app1 ('')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'index: /app1/|/app1/|index.html|');
  });

  it(`should support routing for app1 ('page1.html')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/page1.html?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'index: /app1/page1.html|/app1/|index.html|');
  });

  it(`should support routing for app1 ('page1')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/page1?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'index: /app1/page1|/app1/|index.html|');
  });

  it(`should support routing for app1 ('page2.html')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/page2.html?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'page2 /app1/page2.html|||');
  });

  it(`should support routing for app1 ('page2')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/page2.html?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'page2 /app1/page2.html|||');
  });

  it(`should support routing for app1 ('docs/index.html')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/docs/index.html?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'docs index: /app1/docs/index.html|||');
  });

  it(`should support routing for app1 ('docs/index')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/docs/index?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'docs index: /app1/docs/index|||');
  });

  it(`should support routing for app1 ('docs/other.html')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/docs/other.html?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'docs other: /app1/docs/other.html|||');
  });

  it(`should support routing for app1 ('docs/other')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/docs/other?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'docs other: /app1/docs/other|||');
  });

  it(`should support routing for app1 ('posts/index.html')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/posts/index.html?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'posts index: /app1/posts/index.html|/app1/posts/|index.html|');
  });

  it(`should support routing for app1 ('posts/index')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/posts/index?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'posts index: /app1/posts/index|/app1/posts/|index.html|');
  });

  it(`should support routing for app1 ('posts/other.html')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/posts/other.html?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'posts index: /app1/posts/other.html|/app1/posts/|index.html|');
  });

  it(`should support routing for app1 ('posts/other')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/posts/other?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'posts index: /app1/posts/other|/app1/posts/|index.html|');
  });

  it(`should support routing for app1 ('posts/fake.html')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/posts/fake.html?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'posts index: /app1/posts/fake.html|/app1/posts/|index.html|');
  });

  it(`should support routing for app1 ('posts/fake')`, async () => {
    const doc = await loadPage(`http://localhost:${port}/app1/posts/fake?__noclient`);
    const result = doc.getElementById('result')?.textContent;
    assert.equal(result, 'posts index: /app1/posts/fake|/app1/posts/|index.html|');
  });

});
