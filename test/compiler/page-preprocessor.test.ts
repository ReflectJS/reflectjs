import { assert } from "chai";
import { loadPage } from "../../src/compiler/page-preprocessor";
import Preprocessor from "../../src/preprocessor/preprocessor";
import { DOM_ID_ATTR } from "../../src/runtime/page";
import { getDoc } from "./page-compiler.test";

const pre = new Preprocessor(process.cwd() + '/test/compiler/page-preprocessor');

describe("page-preprocessor", () => {

  it(`empty page`, async () => {
    const doc = await getDoc(pre, `<html></html>`);
    const { props, errors } = loadPage(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    assert.deepEqual(props, {
      root: {
        id: 0, name: 'page', query: 'html',
        children: [
          { id: 1, name: 'head', query: 'head' },
          { id: 2, name: 'body', query: 'body' }
        ]
      }
    });
  });

});
