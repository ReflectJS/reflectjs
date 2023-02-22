import { assert } from "chai";
import * as happy from 'happy-dom';
import { JSDOM } from 'jsdom';
import { PROPS_SCRIPT_ID, RUNTIME_SCRIPT_ID } from "../../src/runtime/page";
import Server from "../../src/server/server-impl";

let server: Server;
let port: number;

describe("server: server-impl", () => {

  before((done) => {
    server = new Server({
      rootPath: process.cwd() + '/test/server/server-impl',
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

  it(`should start`, async () => {
    assert.exists(server);
    assert.exists(port);
    const res = await new happy.Window().fetch(`http://localhost:${port}/text1.txt`);
    assert(res.text, 'test text: text1');
  });

  it(`should get unprocessed page`, async () => {
    const doc = await loadPage(`http://localhost:${port}/page1.txt`);
    assert.equal(doc.body.textContent, 'test text: page1');
  })

  it(`should get static page`, async () => {
    const doc = await loadPage(`http://localhost:${port}/page1.html`);
    doc.getElementById(PROPS_SCRIPT_ID)?.remove();
    doc.getElementById(RUNTIME_SCRIPT_ID)?.remove();
    assert.equal(doc.body.textContent?.trim(), 'test text: page1');
  })

  it(`shouldn't get inexistent page`, async () => {
    const doc = await loadPage(`http://localhost:${port}/inexistent.html`);
    assert.equal(doc.body.textContent, 'error: Could not read file "/inexistent.html"');
  })

  it(`should get dynamic page`, async () => {
    const doc = await loadPage(`http://localhost:${port}/page2.html`);
    doc.getElementById(PROPS_SCRIPT_ID)?.remove();
    doc.getElementById(RUNTIME_SCRIPT_ID)?.remove();
    assert.equal(doc.body.textContent?.trim(), 'hi');
  })

  it(`should run sample1.html`, async () => {
    const doc = await loadPage(`http://localhost:${port}/sample1.html`);
    assert.equal(doc.querySelector('span')?.textContent, '10');
  })

  it(`should serve data`, async () => {
    const win = new happy.Window();
    const res = await win.fetch(`http://localhost:${port}/data1.json`);
    const contentType = res.headers.get('content-type');
    assert.equal(contentType, 'application/json; charset=UTF-8')
    const json = await res.json();
    assert.deepEqual(json, { msg: 'OK' });
  });

  it(`should dynamically load data`, async () => {
    const doc = await loadPage(`http://localhost:${port}/data1.html`);
    const span = doc.getElementById('msg');
    assert.equal(span?.textContent, 'OK');
  });

  it(`should redirect '/' to '/index.html'`, async () => {
    const doc = await loadPage(`http://localhost:${port}`);
    const span = doc.getElementById('msg');
    assert.equal(span?.textContent, 'test: index.html');
  });

  it(`should redirect '/index' to '/index.html'`, async () => {
    const doc = await loadPage(`http://localhost:${port}/index`);
    const span = doc.getElementById('msg');
    assert.equal(span?.textContent, 'test: index.html');
    assert.exists(doc.getElementById(RUNTIME_SCRIPT_ID));
  });

  it(`shouldn't include client runtime w/ ?__noclient`, async () => {
    const doc = await loadPage(`http://localhost:${port}/index.html?__noclient`);
    const span = doc.getElementById('msg');
    assert.equal(span?.textContent, 'test: index.html');
    assert.notExists(doc.getElementById(RUNTIME_SCRIPT_ID));
  });

  it(`should support value 'isServer' (1)`, async () => {
    const doc = await loadPage(`http://localhost:${port}/isServer.html?__noclient`);
    const span = doc.getElementById('msg');
    assert.equal(span?.textContent, 'true');
  });

  it(`should support value 'isServer' (2)`, async () => {
    const doc = await loadPage(`http://localhost:${port}/isServer.html`);
    const span = doc.getElementById('msg');
    assert.equal(span?.textContent, 'false');
  });
});

async function loadPage(url: string) {
  const win = new happy.Window();
  const text = await (await win.fetch(url)).text();
  const dom = new JSDOM(text, { runScripts: "dangerously" });
  return dom.window.document;
}
