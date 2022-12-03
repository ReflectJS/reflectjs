import { assert } from "chai";
import { TEXT_NODE, TEXT_VALUE_PREFIX } from "../../src/runtime/page";
import { addScope, baseApp } from "./page.test";

describe('scope', () => {

  it('should collect a DOM text', () => {
    const page = baseApp(props => {
      addScope(props, [1], {
        id: 3,
        markup: `<span>Hello <!---t0-->x<!----->!</span>`
      });
    });
    const body = page.root.children[1];
    const span = body.children[0];
    assert.equal(span.texts?.length, 1);
    const text = span.texts?.at(0);
    assert.equal(text?.nodeType, TEXT_NODE);
    assert.equal(text?.nodeValue, 'x');
  });

  it('should collect an empty DOM text', () => {
    const page = baseApp(props => {
      addScope(props, [1], {
        id: 3,
        markup: `<span>Hello <!---t0--><!----->!</span>`
      });
    });
    const body = page.root.children[1];
    const span = body.children[0];
    assert.equal(span.texts?.length, 1);
    const text = span.texts?.at(0);
    assert.equal(text?.nodeType, TEXT_NODE);
    assert.equal(text?.nodeValue, '');
  });

});
