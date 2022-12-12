import { assert } from "chai";
import { Window } from 'happy-dom';
import ReflectServer from "../../src/server/server";

describe("server", () => {
  let server: ReflectServer;
  let port: number;

  before((done) => {
    server = new ReflectServer({
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
    const window = new Window({url: `http://localhost:${port}`});
    const res = await window.fetch(`dummy.txt`);
    assert(res.text, 'dummy text');
  });

});
