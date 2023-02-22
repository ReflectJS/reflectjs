import { assert } from "chai";
import { normalizeText } from "../../src/preprocessor/util";
import { DATA_VALUE, DOM_ID_ATTR, Page, TEXT_NODE } from "../../src/runtime/page";
import { Scope } from "../../src/runtime/scope";
import { addScope, baseApp, itemAt } from "./page.test";

describe('runtime: scope', () => {

  // ---------------------------------------------------------------------------
  // dom
  // ---------------------------------------------------------------------------

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
        markup: `<span ${DOM_ID_ATTR}="3">Hello <!---t0--><!----->!</span>`
      });
    });
    const body = page.root.children[1];
    const span = body.children[0];
    assert.equal(span.texts?.length, 1);
    const text = itemAt(0, span.texts);
    assert.equal(text?.nodeType, TEXT_NODE);
    assert.equal(text?.nodeValue, '');
  });

  // ---------------------------------------------------------------------------
  // class attributes
  // ---------------------------------------------------------------------------

  it('should support class attributes 1', () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2" class="block">
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        class_highlight: { val: null, fn: function() { return false; } }
      });
    });
    page.refresh();
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2" class="block">
      </body>
      </html>`)
    );
    const body = page.root.children[1];
    body.proxy['class_highlight'] = true;
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2" class="block highlight">
      </body>
      </html>`)
    );
  });

  it('should support class attributes 2', () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2" class="block highlight">
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        class_highlight: { val: null, fn: function() { return true; } }
      });
    });
    page.refresh();
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2" class="block highlight">
      </body>
      </html>`)
    );
    const body = page.root.children[1];
    body.proxy['class_highlight'] = false;
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2" class="block">
      </body>
      </html>`)
    );
  });

  // ---------------------------------------------------------------------------
  // style attributes
  // ---------------------------------------------------------------------------

  it('should support style attributes 1', () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        style_backgroundColor: { val: null, fn: function() { return null; } }
      });
    });
    page.refresh();
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
      </body>
      </html>`)
    );
    const body = page.root.children[1];
    body.proxy['style_backgroundColor'] = 'blue';
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2" style="background-color: blue;">
      </body>
      </html>`)
    );
  });

  it('should support style attributes 2', () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2" style="background-color: blue;">
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        style_backgroundColor: { val: null, fn: function() { return 'blue'; } }
      });
    });
    page.refresh();
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2" style="background-color: blue;">
      </body>
      </html>`)
    );
    const body = page.root.children[1];
    body.proxy['style_backgroundColor'] = null;
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
      </body>
      </html>`)
    );
  });

  // ---------------------------------------------------------------------------
  // event attributes
  // ---------------------------------------------------------------------------

  it('should support event attributes', () => {
    let clickCount = 0;
    const page = baseApp(null, props => {
      props.root.children && (props.root.children[1].values = {
        on_click: { val: function() { clickCount++; }, domKey: 'click' }
      });
    });
    page.refresh();
    assert.equal(clickCount, 0);
    page.doc.body.click();
    assert.equal(clickCount, 1);
  });

  // ---------------------------------------------------------------------------
  // cloning
  // ---------------------------------------------------------------------------

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
    page.refresh(clone);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3|0"><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></span>` +
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
        <span ${DOM_ID_ATTR}="3|0"><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></span>` +
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
        <span ${DOM_ID_ATTR}="3|0"><!---t0-->Hi<!---/--> <!---t1-->Bob<!---/--></span>` +
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

  // ---------------------------------------------------------------------------
  // replication
  // ---------------------------------------------------------------------------
  //TODO: tests for DATA_OFFSET_VALUE, DATA_LENGTH_VALUE

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

    //
    // 1. it should replicate based on data
    //
    page.refresh();
    assert.equal(body.children.length, 3);
    assert.equal(span.clones?.length, 2);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3|0"><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></span>` +
        `<span ${DOM_ID_ATTR}="3|1"><!---t0-->Hello<!---/--> <!---t1-->Bob<!---/--></span>` +
        `<span ${DOM_ID_ATTR}="3"><!---t0-->Hello<!---/--> <!---t1-->Charles<!---/--></span>
      </body>
      </html>`)
    );

    //
    // 2. it should update clones based on data
    //
    body.proxy[DATA_VALUE] = { list: [ 'Alice', 'Bob' ] };
    assert.equal(body.children.length, 2);
    assert.equal(span.clones?.length, 1);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3|0"><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></span>` +
        `<span ${DOM_ID_ATTR}="3"><!---t0-->Hello<!---/--> <!---t1-->Bob<!---/--></span>
      </body>
      </html>`)
    );

    //
    // 3. it should update clones based on other values
    //
    body.proxy['greeting'] = 'Hi';
    assert.equal(body.children.length, 2);
    assert.equal(span.clones?.length, 1);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3|0"><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></span>` +
        `<span ${DOM_ID_ATTR}="3"><!---t0-->Hi<!---/--> <!---t1-->Bob<!---/--></span>
      </body>
      </html>`)
    );
  });

  // ---------------------------------------------------------------------------
  // nesting
  // ---------------------------------------------------------------------------

  it('should support nested replication 1', () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0--><!---/--> <!---t1--><!---/--></b>
          <span ${DOM_ID_ATTR}="4">
            <b><!---t0--><!---/--> <!---t1--><!---/--></b>
          </span>
        </span>
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        greeting: { val: 'Hello' },
        data: { val: {
          list: [
            { name: 'Alice', list: [
              { name: 'Alice1' },
              // { name: 'Alice2' },
            ] },
            // { name: 'Bob' }
          ]
        } }
      });
      addScope(props, [1], {
        id: '3',
        name: 'outerSpan',
        values: {
          data: { val: null, fn: function() { return this.__outer.data.list; }, refs: ['data'] },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.data.name; }, refs: ['data'] }
        }
      });
      addScope(props, [1, 0], {
        id: '4',
        name: 'innerSpan',
        values: {
          data: { val: null, fn: function() { return this.__outer.data.list; }, refs: ['data'] },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.data && this.data.name; }, refs: ['data'] }
        }
      });
    });

    page.refresh();
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></b>
          <span ${DOM_ID_ATTR}="4">
            <b><!---t0-->Hello<!---/--> <!---t1-->Alice1<!---/--></b>
          </span>
        </span>
      </body>
      </html>`)
    );
  });

  it('should support nested replication 2', () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0--><!---/--> <!---t1--><!---/--></b>
          <span ${DOM_ID_ATTR}="4">
            <b><!---t0--><!---/--> <!---t1--><!---/--></b>
          </span>
        </span>
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        greeting: { val: 'Hello' },
        data: { val: {
          list: [
            { name: 'Alice', list: [
              { name: 'Alice1' },
              { name: 'Alice2' },
            ] },
            // { name: 'Bob' }
          ]
        } }
      });
      addScope(props, [1], {
        id: '3',
        name: 'outerSpan',
        values: {
          data: { val: null, fn: function() { return this.__outer.data.list; }, refs: ['data'] },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.data.name; }, refs: ['data'] }
        }
      });
      addScope(props, [1, 0], {
        id: '4',
        name: 'innerSpan',
        values: {
          data: { val: null, fn: function() { return this.__outer.data.list; }, refs: ['data'] },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.data && this.data.name; }, refs: ['data'] }
        }
      });
    });

    page.refresh();
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></b>
          <span ${DOM_ID_ATTR}="4|0">
            <b><!---t0-->Hello<!---/--> <!---t1-->Alice1<!---/--></b>
          </span>` +
          `<span ${DOM_ID_ATTR}="4">
            <b><!---t0-->Hello<!---/--> <!---t1-->Alice2<!---/--></b>
          </span>
        </span>
      </body>
      </html>`)
    );
  });

  it('should support nested replication 3', () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0--><!---/--> <!---t1--><!---/--></b>
          <span ${DOM_ID_ATTR}="4">
            <b><!---t0--><!---/--> <!---t1--><!---/--></b>
          </span>
        </span>
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        greeting: { val: 'Hello' },
        data: { val: {
          list: [
            { name: 'Alice', list: [] },
            { name: 'Bob', list: [
              { name: 'Bob1' },
              { name: 'Bob2' },
            ] }
          ]
        } }
      });
      addScope(props, [1], {
        id: '3',
        name: 'outerSpan',
        values: {
          data: { val: null, fn: function() { return this.__outer.data.list; }, refs: ['data'] },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.data.name; }, refs: ['data'] }
        }
      });
      addScope(props, [1, 0], {
        id: '4',
        name: 'innerSpan',
        values: {
          data: { val: null, fn: function() { return this.__outer.data.list; }, refs: ['data'] },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.data && this.data.name; }, refs: ['data'] }
        }
      });
    });

    page.refresh();
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3|0">
          <b><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></b>
          <span ${DOM_ID_ATTR}="4">
            <b><!---t0-->Hello<!---/--> <!---t1--><!---/--></b>
          </span>
        </span>` +
        `<span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Hello<!---/--> <!---t1-->Bob<!---/--></b>
          <span ${DOM_ID_ATTR}="4|0">
            <b><!---t0-->Hello<!---/--> <!---t1-->Bob1<!---/--></b>
          </span>` +
          `<span ${DOM_ID_ATTR}="4">
            <b><!---t0-->Hello<!---/--> <!---t1-->Bob2<!---/--></b>
          </span>
        </span>
      </body>
      </html>`)
    );
  });

  it('should support nested replication 4', () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0--><!---/--> <!---t1--><!---/--></b>
          <span ${DOM_ID_ATTR}="4">
            <b><!---t0--><!---/--> <!---t1--><!---/--></b>
          </span>
        </span>
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        greeting: { val: 'Hello' },
        data: { val: {
          list: [
            { name: 'Alice', list: [
              { name: 'Alice1' },
              { name: 'Alice2' },
            ] },
            { name: 'Bob', list: [] }
          ]
        } }
      });
      addScope(props, [1], {
        id: '3',
        name: 'outerSpan',
        values: {
          data: { val: null, fn: function() { return this.__outer.data.list; }, refs: ['data'] },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.data.name; }, refs: ['data'] }
        }
      });
      addScope(props, [1, 0], {
        id: '4',
        name: 'innerSpan',
        values: {
          data: { val: null, fn: function() { return this.__outer.data.list; }, refs: ['data'] },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.data && this.data.name; }, refs: ['data'] }
        }
      });
    });

    page.refresh();
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3|0">
          <b><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></b>
          <span ${DOM_ID_ATTR}="4|0">
            <b><!---t0-->Hello<!---/--> <!---t1-->Alice1<!---/--></b>
          </span>` +
          `<span ${DOM_ID_ATTR}="4">
            <b><!---t0-->Hello<!---/--> <!---t1-->Alice2<!---/--></b>
          </span>
        </span>` +
        `<span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Hello<!---/--> <!---t1-->Bob<!---/--></b>
          <span ${DOM_ID_ATTR}="4">
            <b><!---t0-->Hello<!---/--> <!---t1--><!---/--></b>
          </span>
        </span>
      </body>
      </html>`)
    );
  });

  it('should support nested replication', () => {
    const page = baseApp(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0--><!---/--> <!---t1--><!---/--></b>
        </span>
      </body>
    </html>`, props => {
      props.root.children && (props.root.children[1].values = {
        greeting: { val: 'Hello' },
        data: { val: {
          list: [
            { name: 'Alice', list: [
              { name: 'Alice1' },
              // { name: 'Alice2', list: [
              //   { name: 'Alice2.1' },
              // ] },
            ] },
            // { name: 'Bob', list: [] }
          ]
        } }
      });
      addScope(props, [1], {
        id: '3',
        name: 'theSpan',
        values: {
          nestFor: { val: null, fn: function() { return this.data.list; }, refs: ['data'] },
          data: { val: null, fn: function() { return this.__outer.data.list; }, refs: ['data'] },
          __t0: { val: null, fn: function() { return this.greeting; }, refs: ['greeting'] },
          __t1: { val: null, fn: function() { return this.data.name; }, refs: ['data'] }
        }
      });
    });
    assert.equal(countScopes(page), 4);
    assert.equal(countScopes(page, s => s.dom.tagName === 'SPAN'), 1);

    page.refresh();
    assert.equal(countScopes(page), 5);
    assert.equal(countScopes(page, s => s.dom.tagName === 'SPAN'), 2);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Hello<!---/--> <!---t1-->Alice<!---/--></b>
          <span ${DOM_ID_ATTR}="3/0">
            <b><!---t0-->Hello<!---/--> <!---t1-->Alice1<!---/--></b>
          </span>` +
        `</span>
      </body>
      </html>`)
    );

    const body = page.root.children[1];
    body.proxy['greeting'] = 'Hi';
    assert.equal(countScopes(page), 5);
    assert.equal(countScopes(page, s => s.dom.tagName === 'SPAN'), 2);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></b>
          <span ${DOM_ID_ATTR}="3/0">
            <b><!---t0-->Hi<!---/--> <!---t1-->Alice1<!---/--></b>
          </span>` +
        `</span>
      </body>
      </html>`)
    );

    body.proxy['data'] = {
      list: [
        { name: 'Alice' },
        // { name: 'Bob', list: [] }
      ]
    };
    assert.equal(countScopes(page), 4);
    assert.equal(countScopes(page, s => s.dom.tagName === 'SPAN'), 1);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></b>
        </span>
      </body>
      </html>`)
    );

    body.proxy['data'] = {
      list: [
        { name: 'Alice' },
        { name: 'Bob' },
      ]
    };
    assert.equal(countScopes(page), 5);
    assert.equal(countScopes(page, s => s.dom.tagName === 'SPAN'), 2);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3|0">
          <b><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></b>
        </span>` +
        `<span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Hi<!---/--> <!---t1-->Bob<!---/--></b>
        </span>
      </body>
      </html>`)
    );

    body.proxy['data'] = {
      list: [
        { name: 'Alice', list: [
          { name: 'Alice1' },
          { name: 'Alice2' },
        ] },
        { name: 'Bob' },
      ]
    };
    assert.equal(countScopes(page), 7);
    assert.equal(countScopes(page, s => s.dom.tagName === 'SPAN'), 4);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3|0">
          <b><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></b>
          <span ${DOM_ID_ATTR}="3|0/0">
            <b><!---t0-->Hi<!---/--> <!---t1-->Alice1<!---/--></b>
          </span>` +
          `<span ${DOM_ID_ATTR}="3|0/1">
            <b><!---t0-->Hi<!---/--> <!---t1-->Alice2<!---/--></b>
          </span>` +
        `</span>` +
        `<span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Hi<!---/--> <!---t1-->Bob<!---/--></b>
        </span>
      </body>
      </html>`)
    );

    body.proxy['data'] = {
      list: [
        { name: 'Alice', list: [
          { name: 'Alice1b' },
          { name: 'Alice2b' },
        ] },
        { name: 'Bob' },
      ]
    };
    assert.equal(countScopes(page), 7);
    assert.equal(countScopes(page, s => s.dom.tagName === 'SPAN'), 4);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3|0">
          <b><!---t0-->Hi<!---/--> <!---t1-->Alice<!---/--></b>
          <span ${DOM_ID_ATTR}="3|0/0">
            <b><!---t0-->Hi<!---/--> <!---t1-->Alice1b<!---/--></b>
          </span>` +
          `<span ${DOM_ID_ATTR}="3|0/1">
            <b><!---t0-->Hi<!---/--> <!---t1-->Alice2b<!---/--></b>
          </span>` +
        `</span>` +
        `<span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Hi<!---/--> <!---t1-->Bob<!---/--></b>
        </span>
      </body>
      </html>`)
    );

    body.proxy['greeting'] = 'Ciao';
    assert.equal(countScopes(page), 7);
    assert.equal(countScopes(page, s => s.dom.tagName === 'SPAN'), 4);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3|0">
          <b><!---t0-->Ciao<!---/--> <!---t1-->Alice<!---/--></b>
          <span ${DOM_ID_ATTR}="3|0/0">
            <b><!---t0-->Ciao<!---/--> <!---t1-->Alice1b<!---/--></b>
          </span>` +
          `<span ${DOM_ID_ATTR}="3|0/1">
            <b><!---t0-->Ciao<!---/--> <!---t1-->Alice2b<!---/--></b>
          </span>` +
        `</span>` +
        `<span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Ciao<!---/--> <!---t1-->Bob<!---/--></b>
        </span>
      </body>
      </html>`)
    );

    body.proxy['data'] = {
      list: [
        { name: 'Alice', list: [
          { name: 'Alice1b' },
          { name: 'Alice2b' },
        ] }
      ]
    };
    assert.equal(countScopes(page), 6);
    assert.equal(countScopes(page, s => s.dom.tagName === 'SPAN'), 3);
    assert.equal(
      normalizeText(page.getMarkup()),
      normalizeText(`<!DOCTYPE html><html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>
      <body ${DOM_ID_ATTR}="2">
        <span ${DOM_ID_ATTR}="3">
          <b><!---t0-->Ciao<!---/--> <!---t1-->Alice<!---/--></b>
          <span ${DOM_ID_ATTR}="3/0">
            <b><!---t0-->Ciao<!---/--> <!---t1-->Alice1b<!---/--></b>
          </span>` +
          `<span ${DOM_ID_ATTR}="3/1">
            <b><!---t0-->Ciao<!---/--> <!---t1-->Alice2b<!---/--></b>
          </span>` +
        `</span>
      </body>
      </html>`)
    );
  });

  // ---------------------------------------------------------------------------
  // delegate handlers
  // ---------------------------------------------------------------------------

  it('should call `did_init` (1)', () => {
    let didInitCount = 0;
    const page = baseApp(null, props => {
      props.root.children && (props.root.children[1].values = {
        did_init: { val: null, fn: function() { didInitCount++; }, passive: true }
      });
    });
    page.refresh();
    assert.equal(didInitCount, 1);
    page.refresh();
    assert.equal(didInitCount, 1);
  });

  it('should call `did_init` (2)', () => {
    let didInitCount = 0;
    const page = baseApp(null, props => {
      props.root.children && (props.root.children[1].values = {
        x: { val: null, fn: function() { return 10; } },
        did_init: { val: null, fn: function() { didInitCount++; this.x++; }, passive: true }
      });
    });
    page.refresh();
    assert.equal(didInitCount, 1);
    const body = page.root.children[1];
    const x = body.values['x'];
    assert.equal(x.props.val, 11);
    page.refresh();
    assert.equal(x.props.val, 11);
    assert.equal(didInitCount, 1);
  });

  it('should call `did_init` (3)', () => {
    let didInitCount = 0;
    const page = baseApp(null, props => {
      props.root.children && (props.root.children[1].values = {
        y: { val: null, fn: function() { return this.x + 10; }, refs: ['x'] },
        x: { val: null, fn: function() { return 10; } },
        did_init: { val: null, fn: function() { didInitCount++; this.x++ }, passive: true }
      });
    });
    page.refresh();
    assert.equal(didInitCount, 1);
    const body = page.root.children[1];
    const x = body.values['x'];
    const y = body.values['y'];
    assert.equal(x.props.val, 11);
    assert.equal(y.props.val, 21);
    page.refresh();
    assert.equal(didInitCount, 1);
    assert.equal(x.props.val, 11);
    assert.equal(y.props.val, 21);
  });

});

// -----------------------------------------------------------------------------
// util
// -----------------------------------------------------------------------------

function countScopes(page: Page, filter?: (s: Scope) => boolean): number {
  let ret = 0;
  function f(scope: Scope) {
    if (!filter || filter(scope)) {
      ret++;
    }
    scope.children.forEach(f);
  }
  page.root && f(page.root);
  return ret;
}
