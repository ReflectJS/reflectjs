import { assert } from "chai";
import { Window } from 'happy-dom';
import Server from "../../src/server/server";
import { loadPage } from "./jsdom.test";

let server: Server;
let port: number;

describe("server", () => {

  before((done) => {
    server = new Server({
      rootPath: process.cwd() + '/test/server/pages',
    }, (portNr) => {
      port = portNr;
      done();
    });
  });

  after(async () => {
    return server.close();
  });

  it(`should start`, async () => {
    assert.exists(server);
    assert.exists(port);
    const res = await new Window().fetch(`http://localhost:${port}/dummy.txt`);
    assert(res.text, 'dummy text');
  });

  // it(`happy-dom should navigate to page`, async () => {
  //   const doc = await loadPage(`http://localhost:${port}/dummy.plain.html`);
  //   assert.equal(doc.body.textContent, 'dummy page');
  // })

});
