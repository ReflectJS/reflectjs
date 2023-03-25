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
        `<body data-reflectjs="3">
        <template id="theTemplate" data-reflectjs="4">
        <div id="theDiv">hi there</div>
        </template>
        </body>`
      ));
    })

    it(`off`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html`);
      Array.from(doc.getElementsByTagName('script')).forEach(e => e.remove());
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="3">
        <template id="theTemplate" data-reflectjs="4">
        <div id="theDiv">hi there</div>
        </template>
        </body>`
      ));
    })

    it(`on, noclient`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html?__noclient&on=true`);
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="3">
        <div id="theDiv" data-reflectjs-from="4">hi there</div>` +
        `<template id="theTemplate" data-reflectjs="4"></template>
        </body>`
      ));
    })

    it(`on`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html?on=true`);
      Array.from(doc.getElementsByTagName('script')).forEach(e => e.remove());
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="3">
        <div id="theDiv" data-reflectjs-from="4">hi there</div>` +
        `<template id="theTemplate" data-reflectjs="4"></template>
        </body>`
      ));
    })

  });

  describe("<:on-off> w/ active content", async () => {

    it(`off, noclient`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-active-1.html?__noclient`);
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="3">
        <template id="theTemplate" data-reflectjs="4">
        <div id="theDiv" data-reflectjs="5">hello <span><!---t0--><!---/--></span></div>
        </template>
        </body>`
      ));
    })

    it(`off`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-active-1.html`);
      Array.from(doc.getElementsByTagName('script')).forEach(e => e.remove());
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="3">
        <template id="theTemplate" data-reflectjs="4">
        <div id="theDiv" data-reflectjs="5">hello <span><!---t0--><!---/--></span></div>
        </template>
        </body>`
      ));
    })

    it(`on, noclient`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-active-1.html?__noclient&on=true`);
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="3">
        <div id="theDiv" data-reflectjs="5" data-reflectjs-from="4">hello ` +
        `<span><!---t0-->there<!---/--></span>` +
        `</div><template id="theTemplate" data-reflectjs="4"></template>
        </body>`
      ));
    })

    it(`on, client`, async () => {
      const doc = await loadPage(`${baseUrl}/on-off/on-off-active-1.html?on=true`);
      Array.from(doc.getElementsByTagName('script')).forEach(e => e.remove());
      assert.equal(normalizeText(doc.body.outerHTML), normalizeText(
        `<body data-reflectjs="3">
        <div id="theDiv" data-reflectjs="5" data-reflectjs-from="4">hello ` +
        `<span><!---t0-->there<!---/--></span>` +
        `</div><template id="theTemplate" data-reflectjs="4"></template>
        </body>`
      ));
    })

  });

  describe("<:page-router>", async () => {
    //TODO

    // it(`shouldn't handle pages w/o :URLPATH attribute`, async () => {
    //   const doc = await loadPage(`${baseUrl}/page-router`);
    //   assert.equal(doc.title, 'page-router/index.html');
    //   doc.getElementById('goToOther')?.click();
    // });

  });

});

async function loadPage(url: string) {
  // we're using JSDOM for simulating the client, because
  // `isServer` is true when the environment is happy-dom
  const dom = await JSDOM.fromURL(url, { runScripts: "dangerously" });
  return dom.window.document;
}
