import { assert } from "chai";
import * as happy from 'happy-dom';
import { JSDOM } from 'jsdom';
import puppeteer, { Browser } from "puppeteer";
import { normalizeText } from "../../src/preprocessor/util";
import { Server } from "../../src/server";
import { DOMWindow } from "jsdom";

let server: Server;
let baseUrl: string;
let browser: Browser;
let servedPages = 0;

describe("server: stdlib <:page-router>", function() {
  this.timeout(10000);

  before((done) => {
    server = new Server({
      rootPath: process.cwd() + '/test/server/stdlib/page-router',
      __clientJsFilePath: process.cwd() + '/dist/client.js',
      mute: true,
      __willServePage: (url) => servedPages++,
    }, (portNr) => {
      baseUrl = `http://localhost:${portNr}`;
      puppeteer.launch({
        headless: true,
        devtools: false,
      }).then(b => {
        browser = b;
        done();
      });
    });
  });

  after(async () => {
    await browser.close();
    await server.close();
  });

  describe("<:page-router>", async function() {
    // increase default timeout (from 2000)
    // because we're using puppeteer w/ headless chrome
    // and first launch on CI servers can take time
    this.timeout(10000);

    it(`shouldn't intercept pages w/o :URLPATH attribute`, async () => {
      const page = await browser.newPage();
      await page.goto(baseUrl);
      assert.equal(await page.title(), 'page-router/index.html');
      await page.click('#goToOther');
      assert.equal(await page.title(), 'page-router/other.html');
      await page.close();
    });

    it(`should intercept pages w/ :URLPATH attribute`, async () => {
      const page = await browser.newPage();
      const count1 = servedPages;
      await page.goto(`${baseUrl}/dummy`);
      assert.equal(servedPages, count1 + 1);
      await page.click('#goto-dummy2');
      assert.equal(servedPages, count1 + 1);
      assert.equal(await page.title(), 'page-router/app.html');
      assert.equal(await page.$eval('#path', e => e.textContent), '/dummy2');
      await page.close();
    });

    it(`shouldn't intercept pages in EXTURLS`, async () => {
      const page = await browser.newPage();
      const count1 = servedPages;
      await page.goto(`${baseUrl}/dummy`);
      assert.equal(servedPages, count1 + 1);
      await page.click('#goto-index');
      assert.equal(servedPages, count1 + 2);
      assert.equal(await page.title(), 'page-router/index.html');
      await page.close();
    });

    it(`should display alternative content w/ :on-off (1)`, async () => {
      let win: DOMWindow;

      win = await loadPage(`${baseUrl}/on-off-1?__noclient`);
      assert.equal(win.document.querySelector('body div')?.textContent, 'Index');
      win.close();

      win = await loadPage(`${baseUrl}/on-off-1/index?__noclient`);
      assert.equal(win.document.querySelector('body div')?.textContent, 'Index');
      win.close();

      win = await loadPage(`${baseUrl}/on-off-1/doc?__noclient`);
      assert.equal(win.document.querySelector('body div')?.textContent, 'Doc');
      win.close();

      win = await loadPage(`${baseUrl}/on-off-1/inexistent?__noclient`);
      assert.notExists(win.document.querySelector('body div'));
      win.close();
    });

    it(`should display alternative content w/ :on-off (2)`, async () => {
      let win: DOMWindow;

      win = await loadPage(`${baseUrl}/on-off-2?__noclient`);
      assert.equal(win.document.querySelector('body div h1')?.textContent, 'Quick Start');
      win.close();

      win = await loadPage(`${baseUrl}/on-off-2/introduction?__noclient`);
      assert.equal(win.document.querySelector('body div h1')?.textContent, 'Introduction');
      win.close();
    });

  });

});

async function loadPage(url: string): Promise<DOMWindow> {
  // we're using JSDOM for simulating the client, because
  // `isServer` is true when the environment is happy-dom
  const dom = await JSDOM.fromURL(url, { runScripts: "dangerously" });
  return dom.window;
}
