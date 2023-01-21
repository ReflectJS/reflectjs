import { assert } from "chai";
import express from 'express';
import * as happy from 'happy-dom';
import { Server } from 'http';
import { JSDOM } from 'jsdom';

const rootPath = process.cwd() + '/test/server/happydom';

describe('server: happydom', () => {
  let server: Server;
  let port: number;

  before(async () => {
    const app = express();
    app.get("*.json", async (req, res, next) => {
      const delay = parseInt(req.headers['x-test-delay'] as string);
      await new Promise(resolve => setTimeout(resolve, delay));
      next('route');
    });
    app.use(express.static(rootPath));
    return new Promise(resolve => {
      server = app.listen(() => {
        port = (server.address() as any).port;
        resolve();
      });
    });
  });

  after(() => {
    server.close();
  });

  it(`should dynamically load data (no delay)`, async () => {
    const doc = await loadPage(`http://localhost:${port}/data1.html`);
    const span = doc.getElementById('msg');
    assert.equal(span.textContent, 'OK');
  });

  it(`should dynamically load data (normal delay)`, async () => {
    const doc = await loadPage(`http://localhost:${port}/data1b.html`);
    const span = doc.getElementById('msg');
    assert.equal(span.textContent, 'OK');
  });

  it(`should dynamically load data (delay timeout)`, async () => {
    const doc = await loadPage(`http://localhost:${port}/data1c.html`);
    const span = doc.getElementById('msg');
    assert.equal(span.textContent, '');
  });

});

export async function loadPage(url: string) {
  const win = new happy.Window({
    url: url.toString(),
    // https://github.com/capricorn86/happy-dom/tree/master/packages/happy-dom#settings
    settings: {
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: false,
      disableCSSFileLoading: true,
      enableFileSystemHttpRequests: false
    }
  } as any);
  const text = await (await win.fetch(url)).text();
  win.document.write(text);
  // await win.happyDOM.whenAsyncComplete();
  await Promise.race([
    win.happyDOM.whenAsyncComplete(),
    new Promise(resolve => setTimeout(resolve, 500))
  ])
  win.happyDOM.cancelAsync();
  await new Promise(resolve => setTimeout(resolve, 0));
  return win.document;
}
