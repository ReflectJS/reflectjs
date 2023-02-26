import { assert } from "chai";
import * as happy from 'happy-dom';
import { DOM_ID_ATTR } from "../../src/runtime/page";
import { normalizeText } from "../../src/preprocessor/util";
import Server from "../../src/server/server-impl";

let server: Server;
let baseUrl: string;

describe("server: stdlib", () => {

  before((done) => {
    server = new Server({
      rootPath: process.cwd() + '/test/server/stdlib',
      clientJsFilePath: process.cwd() + '/dist/client.js',
      mute: false
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
      const win = await loadPage(`${baseUrl}/data-source/auto-get.html`);
      const span = win.document.getElementById('theSpan');
      assert.equal(span?.textContent, 'OK');
    })

    it(`non-auto-get.html`, async () => {
      const win = await loadPage(`${baseUrl}/data-source/non-auto-get.html`);
      const span = win.document.getElementById('theSpan');
      assert.equal(span?.textContent, '');
    })

  });

  describe("<:on-off>", async () => {

    it(`passive, off, noclient`, async () => {
      const win = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html?__noclient`);
      assert.equal(normalizeText(win.document.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <template id="theTemplate" data-reflectjs="3">
        <div id="theDiv">hi there</div>
        </template>
        </body>`
      ));
    })

    it(`passive, off`, async () => {
      const win = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html`);
      win.document.getElementsByTagName('script').forEach(e => e.remove());
      assert.equal(normalizeText(win.document.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <template id="theTemplate" data-reflectjs="3">
        <div id="theDiv">hi there</div>
        </template>
        </body>`
      ));

    })

    it(`passive, on, noclient`, async () => {
      const win = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html?__noclient&on=true`);
      assert.equal(normalizeText(win.document.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <div id="theDiv" data-refjs-template="3">hi there</div>` +
        `<template id="theTemplate" data-reflectjs="3"></template>
        </body>`
      ));
    })

    it(`passive, on`, async () => {
      const win = await loadPage(`${baseUrl}/on-off/on-off-passive-1.html?on=true`);
      win.document.getElementsByTagName('script').forEach(e => e.remove());
      assert.equal(normalizeText(win.document.body.outerHTML), normalizeText(
        `<body data-reflectjs="2">
        <div id="theDiv" data-refjs-template="3">hi there</div>` +
        `<template id="theTemplate" data-reflectjs="3"></template>
        </body>`
      ));
    })

  });

});

async function loadPage(url: string) {
  const win = new happy.Window();
  const text = await (await win.fetch(url)).text();
  win.document.write(text);
  return win;
}
