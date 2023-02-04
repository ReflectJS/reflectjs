import { assert } from "chai";
import Server from "../../src/server/server-impl";
import { loadPage } from "./jsdom.test";

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

});
