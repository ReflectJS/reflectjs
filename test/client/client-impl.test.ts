import { assert } from "chai";
import fs from "fs";
import { GlobalWindow, Window } from "happy-dom";
import { loadClientPage } from "../../src/client/client-impl";
import { PAGE_JS_ID, PROPS_SCRIPT_ID, Page, RUNTIME_SCRIPT_ID } from "../../src/runtime/page";
import { loadTestPage } from "../compiler/page-samples.test";

const rtPath = process.cwd() + '/dist/client.js';
const rootPath = process.cwd() + '/test/client/client-impl';
let runtimeJs;

describe('client: client-impl', async () => {

  before(async () => {
    runtimeJs = await fs.promises.readFile(rtPath, { encoding: 'utf-8' });
  });

  it(`should load a simple page 1`, async () => {
    const html = await servePage(`<html lang=[['en']]></html>`);
    const win = new GlobalWindow();
    win.document.write(html);
    const page = loadClientPage(win);
    win.document.getElementById(PROPS_SCRIPT_ID).remove();
    assert.equal(
      page.getMarkup(),
      `<!DOCTYPE html><html data-reflectjs="0" lang="en">` +
      `<head data-reflectjs="1"></head>` +
      `<body data-reflectjs="2"></body></html>`
    );
    page.root.proxy['attr_lang'] = 'it';
    assert.equal(
      page.getMarkup(),
      `<!DOCTYPE html><html data-reflectjs="0" lang="it">` +
      `<head data-reflectjs="1"></head>` +
      `<body data-reflectjs="2"></body></html>`
    );
  });

  it(`should load a simple page 2`, async () => {
    const html = await servePage(`<html lang=[['en']]></html>`);
    const page = await loadPage(html);
    assert.exists(page);
    assert.equal(page.doc.documentElement.getAttribute('lang'), 'en');
    page.root.proxy['attr_lang'] = 'it';
    assert.equal(page.doc.documentElement.getAttribute('lang'), 'it');
  });

});

async function loadPage(html: string): Promise<Page> {
  const win = new Window();
  const doc = win.document;
  doc.write(html);
  const e = doc.createElement('script');
  e.id = RUNTIME_SCRIPT_ID;
  e.appendChild(doc.createTextNode(runtimeJs));
  doc.body.appendChild(e);
  const page: Page = win[PAGE_JS_ID];
  return page;
}

async function servePage(html: string): Promise<string> {
  const test = await loadTestPage(rootPath, 'sample1.html', html);
  const page = test.page as Page;
  page.refresh();
  const e = page.doc.createElement('script');
  e.setAttribute('id', PROPS_SCRIPT_ID);
  e.setAttribute('type', 'text/json');
  e.appendChild(page.doc.createTextNode(test.js ?? ''));
  page.doc.body.appendChild(e);
  return page.getMarkup();
}
