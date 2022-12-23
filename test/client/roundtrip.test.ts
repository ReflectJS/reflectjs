import { assert } from "chai";
import Server from "../../src/server/server-impl";
import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';
import { PAGE_JS_ID } from "../../src/runtime/page";

const rootPath = process.cwd() + '/test/client/roundtrip';

let server: Server;
let port: number;

describe('client: roundtrip', async () => {

  before((done) => {
    server = new Server({
      rootPath: process.cwd() + '/test/client/roundtrip',
      mute: true,
      clientJsFilePath: process.cwd() + '/dist/client.js'
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
              const dom = await loadPage(dir, file);
              assert.exists(dom.window[PAGE_JS_ID]);
              //TODO
              console.log(dom.serialize());
            });

          }
        });
      });

    }
  });

});

async function loadPage(dir: string, file: string): Promise<JSDOM> {
  dir = encodeURIComponent(dir);
  file = encodeURIComponent(file);
  // https://github.com/jsdom/jsdom/blob/master/README.md
  const url = `http://localhost:${port}/${dir}/${file}`
  const dom = await JSDOM.fromURL(url, {
    resources: 'usable',
    runScripts: 'dangerously'
  });
  return dom;
}
