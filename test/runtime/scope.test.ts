import { assert } from "chai";
import { normalizeText } from "../../src/preprocessor/util";
import { DATA_VALUE, DOM_ID_ATTR, TEXT_NODE } from "../../src/runtime/page";
import { addScope, baseApp, itemAt } from "./page.test";

describe('scope', () => {

  it('should collect a DOM text', () => {
    const page = baseApp(null, props => {
      addScope(props, [1], {
        id: '3',
        markup: `<span>Hello <!---t0-->x<!----->!</span>`
      });
    });
    const body = page.root.children[1];
    const span = body.children[0];
    assert.equal(span.texts?.length, 1);
    const text = itemAt(0, span.texts);
    assert.equal(text?.nodeType, TEXT_NODE);
    assert.equal(text?.nodeValue, 'x');
  });

  it('should collect an empty DOM text', () => {
    const page = baseApp(null, props => {
      addScope(props, [1], {
        id: '3',
        markup: `<span>Hello <!---t0--><!----->!</span>`
      });
    });
    const body = page.root.children[1];
    const span = body.children[0];
    assert.equal(span.texts?.length, 1);
    const text = itemAt(0, span.texts);
    assert.equal(text?.nodeType, TEXT_NODE);
    assert.equal(text?.nodeValue, '');
  });

  it(`should clone and dispose`, () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3"><!---t0--><!---/--> <!---t1--><!---/--></span>
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        greeting: { val: 'Hello' }
      });
      addScope(props, [1], {
        id: '3',
        name: 'theSpan',
        query: `[${DOM_ID_ATTR}="3"]`,
        values: {
          name: { val: null, fn: function() { return 'Alice'; } },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.name; }, refs: ['name'] }
        }
      });
    });

    page.refresh();
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3"><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></span>
      </body>
      </html>`)
    );
    const body = page.root.children[1];
    assert.equal(body.values['greeting'].dst?.size, 1);
    const span = body.children[0];
    assert.equal(span.proxy['__t1'], 'Alice');

    const clone = span.clone(0);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3.0"><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></span>` +
        `<span ${DOM_ID_ATTR}="3"><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></span>
      </body>
      </html>`)
    );

    assert.equal(body.values['greeting'].dst?.size, 2);
    body.proxy['greeting'] = 'Hi';
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3.0"><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></span>` +
        `<span ${DOM_ID_ATTR}="3"><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></span>
      </body>
      </html>`)
    );

    clone.proxy['name'] = 'Bob';
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3.0"><!---t0-->Hi<!---/--> <!---t1-->Bob<!---/--></span>` +
        `<span ${DOM_ID_ATTR}="3"><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></span>
      </body>
      </html>`)
    );

    clone.dispose();
    assert.equal(body.values['greeting'].dst?.size, 1);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3"><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></span>
      </body>
      </html>`)
    );

    body.proxy['greeting'] = 'OK';
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3"><!---t0-->OK<!---/--> <!---t1-->Alice<!---/--></span>
      </body>
      </html>`)
    );
  });

  it('should replicate', () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3"><!---t0--><!---/--> <!---t1--><!---/--></span>
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        greeting: { val: 'Hello' },
        data: { val: { list: [ 'Alice', 'Bob', 'Charles' ] } }
      });
      addScope(props, [1], {
        id: '3',
        name: 'theSpan',
        query: `[${DOM_ID_ATTR}="3"]`,
        values: {
          data: { val: null, fn: function() { return this.__outer.data.list; }, refs: ['data'] },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.data; }, refs: ['data'] }
        }
      });
    });

    const body = page.root.children[1];
    assert.equal(body.children.length, 1);
    const span = body.children[0];
    assert.notExists(span.clones);

    page.refresh();
    assert.equal(body.children.length, 3);
    assert.equal(span.clones?.length, 2);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3.0"><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></span>` +
        `<span ${DOM_ID_ATTR}="3.1"><!---t0-->Hello<!---/--> <!---t1-->Bob<!---/--></span>` +
        `<span ${DOM_ID_ATTR}="3"><!---t0-->Hello<!---/--> <!---t1-->Charles<!---/--></span>
      </body>
      </html>`)
    );

    body.proxy[DATA_VALUE] = { list: [ 'Alice', 'Bob' ] };
    assert.equal(body.children.length, 2);
    assert.equal(span.clones?.length, 1);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3.0"><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></span>` +
        `<span ${DOM_ID_ATTR}="3"><!---t0-->Hello<!---/--> <!---t1-->Bob<!---/--></span>
      </body>
      </html>`)
    );
  });

});
