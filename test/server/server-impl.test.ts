import { assert } from "chai";
import * as happy from 'happy-dom';
import { Window } from 'happy-dom';
import { PROPS_SCRIPT_ID } from "../../src/runtime/page";
import Server from "../../src/server/server-impl";
import { loadPage } from "./jsdom.test";

let server: Server;
let port: number;

describe("server: server-impl", () => {

  before((done) => {
    server = new Server({
      rootPath: process.cwd() + '/test/server/server-impl',
      mute: true
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
    const res = await new Window().fetch(`http://localhost:${port}/text1.txt`);
    assert(res.text, 'test text: text1');
  });

  it(`should get unprocessed page`, async () => {
    const doc = await loadPage(`http://localhost:${port}/page1.txt`);
    assert.equal(doc.body.textContent, 'test text: page1');
  })

  it(`should get static page`, async () => {
    const doc = await loadPage(`http://localhost:${port}/page1.html`);
    doc.getElementById(PROPS_SCRIPT_ID)?.remove();
    assert.equal(doc.body.textContent?.trim(), 'test text: page1');
  })

  it(`shouldn't get inexistent page`, async () => {
    const doc = await loadPage(`http://localhost:${port}/inexistent.html`);
    assert.equal(doc.body.textContent, 'error: Could not read file "/inexistent.html"');
  })

  it(`should get dynamic page`, async () => {
    const doc = await loadPage(`http://localhost:${port}/page2.html`);
    doc.getElementById(PROPS_SCRIPT_ID)?.remove();
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
});
