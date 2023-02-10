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

  it(`should run external js`, async () => {
    const doc = await loadPage(`http://localhost:${port}/exjs.html`, true);
    const span = doc.getElementsByTagName('span')[0];
    assert.equal(span.textContent, 'from exjs.js');
  });
});

export async function loadPage(url: string, loadJS = false) {
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
  return win.document;
}
