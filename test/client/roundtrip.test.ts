import { assert } from "chai";
import fs from 'fs';
import * as happy from 'happy-dom';
import { JSDOM } from 'jsdom';
import path from 'path';
import { Page, PAGE_JS_ID } from "../../src/runtime/page";
import Server from "../../src/server/server-impl";

const rootPath = process.cwd() + '/test/client/roundtrip';

let server: Server;
let port: number;

describe('client: roundtrip', async () => {

  before((done) => {
    server = new Server({
      rootPath: process.cwd() + '/test/client/roundtrip',
      clientJsFilePath: process.cwd() + '/dist/client.js',
      mute: true,
    }, (portNr) => {
      port = portNr;
      done();
    });
  });

  after(async () => {
    return server.close();
  });

  fs.readdirSync(rootPath).forEach(dir => {
    if (
      fs.statSync(path.join(rootPath, dir)).isDirectory() &&
      !dir.startsWith('.')
    ) {

      describe(dir, () => {
        const dirPath = path.join(rootPath, dir);
        fs.readdirSync(dirPath).forEach(file => {
          if (
            fs.statSync(path.join(dirPath, file)).isFile() &&
            file.endsWith('.html')
          ) {

            it(file.replace(/(\.html)$/, ''), async () => {
              const jsdom = await loadPage(`http://localhost:${port}/${dir}/${file}`);
              try {
                // console.log(dom.serialize())
                const page: Page = jsdom.window[PAGE_JS_ID];
                assert.exists(page, jsdom.window.document.documentElement.outerHTML);
                assert.exists(page.root);
                assert.exists(page.root.proxy['test']);
                const res = page.root.proxy['test']();
                assert.equal(res, 'OK');
              } finally {
                jsdom.window.close();
              }
            });

          }
        });
      });

    }
  });

});

export async function loadPage(url: string) {
  // we're using happy-dom for its `fetch` implementation
  const win = new happy.Window();
  const text = await (await win.fetch(url)).text();
  // but we're returning a jsdom document because it does execute page scripts
  const dom = new JSDOM(text, { runScripts: "dangerously" });
  return dom;
}
