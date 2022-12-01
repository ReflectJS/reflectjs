import { assert } from 'chai';
import { Window } from 'happy-dom';
import { DOM_ID_ATTR, Page, Scope } from '../../src/reflectjs/runtime';

describe('scope', function () {

  it("should create scope from DOM", () => {
    const win = new Window();
    const doc = win.document;
    const page = new Page(doc, 'page');
    assert.equal(page.id, 0);
    assert.equal(page.name, 'page');
    assert.equal(
      doc.documentElement.outerHTML,
      `<html ${DOM_ID_ATTR}="0"><head></head><body></body></html>`
    );
  });

  it("should create scope from markup", () => {
    const win = new Window();
    const doc = win.document;
    const page = new Page(doc, 'page');
    const body = new Scope(page, doc.body, 'body');
    const scope = new Scope(body, `<span>hi</span>`);
    assert.equal(
      doc.documentElement.outerHTML,
      `<html ${DOM_ID_ATTR}=\"0\"><head></head>` +
      `<body ${DOM_ID_ATTR}=\"1\"><span ${DOM_ID_ATTR}=\"2\">hi</span></body>` +
      `</html>`
    );
  });

  it("should create scope values from DOM", () => {
    const win = new Window();
    const doc = win.document;
    doc.documentElement.setAttribute(':v', '[[1]]');
    const page = new Page(doc, 'page');
    assert.equal(page.id, 0);
    assert.equal(page.name, 'page');
    assert.exists(page.values['v']);
    assert.equal(
      doc.documentElement.outerHTML,
      `<html ${DOM_ID_ATTR}="0"><head></head><body></body></html>`
    );
  });

});
