import { assert } from "chai";
import * as happy from 'happy-dom';
import { resolve } from "path";
import { Worker } from 'worker_threads';

const rootPath = process.cwd() + '/test/server/happydom';

describe('server: happydom', () => {
  let port = '4000';

  before((done) => {
    /**
     * we have to run Express in another thread because
     * HappyDom seems to load external JS in synchronous
     * mode and they go in deadlock if in the same thread
     */
    const path = resolve(__dirname, 'happydom' , '_server.js');
    const worker = new Worker(path, { workerData: port });
    worker.on('message', () => done());
  });

  it(`should implement innerText setter`, () => {
    const doc = new happy.Window().document;
    doc.write(`<html><body><code id="code"></code></body></html>`);
    const code = doc.getElementById('code') as happy.HTMLElement;
    code.innerText = `<div>\n</div>`;
    assert.equal(
      doc.documentElement.outerHTML,
      `<html><body><code id="code"><div><br></div></code></body></html>`
    );
  });

  it(`should implement previousElementSibling`, () => {
    const doc = new happy.Window().document;
    doc.write(`<html><head></head><body></body></html>`);
    assert.equal(doc.body.previousElementSibling, doc.head);
  });

  it(`<template> should implement previousElementSibling`, () => {
    const doc = new happy.Window().document;
    doc.write(`<html><body><div></div><template></template></body></html>`);
    const div = doc.getElementsByTagName('div')[0];
    const template = doc.getElementsByTagName('template')[0];
    let prev: happy.IElement | null = template.previousElementSibling;

    // happy-dom bug: previousSibling doesn't work on HTMLTemplateElement
    const cc = Array.from(template.parentElement.children);
    const i = cc.indexOf(template);
    prev = (i > 0 ? cc[i - 1] : null);

    assert.equal(prev, div);
  });

  it(`should dynamically load data (no delay)`, async () => {
    const win = await loadPage(`http://localhost:${port}/data1.html`);
    const span = win.document.getElementById('msg');
    assert.equal(span.textContent, 'OK');
  });

  it(`should dynamically load data (normal delay)`, async () => {
    const win = await loadPage(`http://localhost:${port}/data1b.html`);
    const span = win.document.getElementById('msg');
    assert.equal(span.textContent, 'OK');
  });

  it(`should dynamically load data (delay timeout)`, async () => {
    const win = await loadPage(`http://localhost:${port}/data1c.html`);
    const span = win.document.getElementById('msg');
    assert.equal(span.textContent, '');
  });

  it(`should run external js`, async () => {
    const win = await loadPage(`http://localhost:${port}/exjs.html`, true);
    const span = win.document.getElementsByTagName('span')[0];
    assert.equal(span.textContent, 'from exjs.js');
  });

  it(`should run embedded js (1)`, async () => {
    const win = await loadPage(`http://localhost:${port}/js1.html`, true);
    const span = win.document.getElementsByTagName('span')[0];
    assert.equal(span.textContent, 'meta');
  });

  it(`should run embedded js (2)`, async () => {
    const win = await loadPage(`http://localhost:${port}/js2.html`, true);
    const span = win.document.getElementsByTagName('span')[0];
    assert.equal(span.textContent, '1');
  });

  it(`should run dynamically added script`, async () => {
    const win = new happy.Window({ settings: {
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: false,
      disableCSSFileLoading: true,
      enableFileSystemHttpRequests: false
    }});
    const doc = win.document;
    doc.write(`<html><body><span id="span">0</span></body></html>`);
    const script = doc.createElement('script');
    script.id = 'test-script';
    script.appendChild(doc.createTextNode(`
      const span = document.getElementById('span');
      let n = parseInt(span.innerText);
      span.innerText = '' + (n + 1);
    `));
    doc.body.appendChild(script);
    doc.body.appendChild(doc.createTextNode('\n'));
    await win.happyDOM.whenAsyncComplete();
    const span = doc.getElementsByTagName('span')[0];
    assert.equal(span.textContent, '1');
  });

});

export async function loadPage(url: string, loadJS = false): Promise<happy.Window> {
  const win = new happy.Window({
    url: url.toString(),
    // https://github.com/capricorn86/happy-dom/tree/master/packages/happy-dom#settings
    settings: {
      disableJavaScriptFileLoading: !loadJS,
      disableJavaScriptEvaluation: false,
      disableCSSFileLoading: true,
      enableFileSystemHttpRequests: false
    }
  } as any);
  const text = await (await win.fetch(url)).text();
  win.document.write(text);
  await Promise.race([
    win.happyDOM.whenAsyncComplete(),
    new Promise(resolve => setTimeout(resolve, 500))
  ])
  win.happyDOM.cancelAsync();
  await new Promise(resolve => setTimeout(resolve, 0));
  return win;
}
