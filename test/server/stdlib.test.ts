import { assert } from "chai";
import * as happy from 'happy-dom';
import { JSDOM } from 'jsdom';
import { normalizeText } from "../../src/preprocessor/util";
import Server from "../../src/server/server-impl";

let server: Server;
let baseUrl: string;

describe("server: stdlib", () => {

  before((done) => {
    server = new Server({
      rootPath: process.cwd() + '/test/server/stdlib',
      clientJsFilePath: process.cwd() + '/dist/client.js',
      mute: true
    }, (portNr) => {
      baseUrl = `http://localhost:${portNr}`;
      done();
    });
  });

  after(async () => {
    return server.close();
  });

  describe("<:data-source>", () => {

    it(`auto-get.html`, async () => {
      const doc = await loadPage(`${baseUrl}/data-source/auto-get.html`);
      const span = doc.getElementById('theSpan');
      assert.equal(span?.textContent, 'OK');
    })

    it(`non-auto-get.html`, async () => {
      const doc = await loadPage(`${baseUrl}/data-source/non-auto-get.html`);
      const span = doc.getElementById('theSpan');
      assert.equal(span?.textContent, '');
    })

  });

  describe("<:on-off> w/ passive content", async () => {

    it(`off, noclient`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html?__noclient`);
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <template id="theTemplate" data-reflectjs="3">
        <div id="theDiv">hi there</div>
        </template>
        </body>`
      ));
    })

    it(`off`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html`);
      Array.from(doc.getElementsByTagName('script')).forEach(e => e.remove());
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <template id="theTemplate" data-reflectjs="3">
        <div id="theDiv">hi there</div>
        </template>
        </body>`
      ));
    })

    it(`on, noclient`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html?__noclient&on=true`);
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <div id="theDiv" data-reflectjs-from="3">hi there</div>` +
        `<template id="theTemplate" data-reflectjs="3"></template>
        </body>`
      ));
    })

    it(`on`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html?on=true`);
      Array.from(doc.getElementsByTagName('script')).forEach(e => e.remove());
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <div id="theDiv" data-reflectjs-from="3">hi there</div>` +
        `<template id="theTemplate" data-reflectjs="3"></template>
        </body>`
      ));
    })

  });

  describe("<:on-off> w/ active content", async () => {

    it(`off, noclient`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-active-1.html?__noclient`);
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <template id="theTemplate" data-reflectjs="3">
        <div id="theDiv" data-reflectjs="4">hello <span><!---t0--><!---/--></span></div>
        </template>
        </body>`
      ));
    })

    it(`off`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-active-1.html`);
      Array.from(doc.getElementsByTagName('script')).forEach(e => e.remove());
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <template id="theTemplate" data-reflectjs="3">
        <div id="theDiv" data-reflectjs="4">hello <span><!---t0--><!---/--></span></div>
        </template>
        </body>`
      ));
    })

    it(`on, noclient`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-active-1.html?__noclient&on=true`);
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <div id="theDiv" data-reflectjs="4" data-reflectjs-from="3">hello ` +
        `<span><!---t0-->there<!---/--></span>` +
        `</div><template id="theTemplate" data-reflectjs="3"></template>
        </body>`
      ));
    })

    it(`on, client`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-active-1.html?on=true`);
      Array.from(doc.getElementsByTagName('script')).forEach(e => e.remove());
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <div id="theDiv" data-reflectjs="4" data-reflectjs-from="3">hello ` +
        `<span><!---t0-->there<!---/--></span>` +
        `</div><template id="theTemplate" data-reflectjs="3"></template>
        </body>`
      ));
    })

  });

});

async function loadPage(url: string) {
  const win = new happy.Window();
  const text = await (await win.fetch(url)).text();
  // we're using JSDOM for simulating the client, because
  // `isServer` is true when the environment is happy-dom
  const dom = new JSDOM(text, {
    url: url,
    runScripts: "dangerously"
  });
  return dom.window.document;
}
