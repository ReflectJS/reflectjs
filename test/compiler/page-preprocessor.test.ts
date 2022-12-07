import { assert } from "chai";
import { hyphenToCamel, loadPage } from "../../src/compiler/page-preprocessor";
import Preprocessor from "../../src/preprocessor/preprocessor";
import { normalizeText } from "../../src/preprocessor/util";
import { DOM_ID_ATTR, PageProps } from "../../src/runtime/page";
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

  it(`page w/ dynamic value 1`, async () => {
    const doc = await getDoc(pre, `<html :v="x"></html>`);
    const { props, errors } = loadPage(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    const expected: PageProps = {
      root: {
        id: 0, name: 'page', query: 'html',
        values: {
          v: { val: 'x' }
        },
        children: [
          { id: 1, name: 'head', query: 'head' },
          { id: 2, name: 'body', query: 'body' }
        ]
      }
    }
    assert.deepEqual(props, expected);
  });

  it(`page w/ dynamic value 2`, async () => {
    const doc = await getDoc(pre, `<html :v=[[x]]></html>`);
    const { props, errors } = loadPage(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    const expected: PageProps = {
      root: {
        id: 0, name: 'page', query: 'html',
        values: {
          v: { val: '[[x]]' }
        },
        children: [
          { id: 1, name: 'head', query: 'head' },
          { id: 2, name: 'body', query: 'body' }
        ]
      }
    }
    assert.deepEqual(props, expected);
  });

  it(`page w/ dynamic value 3`, async () => {
    const doc = await getDoc(pre, `<html :v="[[x]]"></html>`);
    const { props, errors } = loadPage(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    const expected: PageProps = {
      root: {
        id: 0, name: 'page', query: 'html',
        values: {
          v: { val: '[[x]]' }
        },
        children: [
          { id: 1, name: 'head', query: 'head' },
          { id: 2, name: 'body', query: 'body' }
        ]
      }
    }
    assert.deepEqual(props, expected);
  });

  it(`page w/ dynamic value 4`, async () => {
    const doc = await getDoc(pre, `<html v="[[x]]"></html>`);
    const { props, errors } = loadPage(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    const expected: PageProps = {
      root: {
        id: 0, name: 'page', query: 'html',
        values: {
          attr_v: { val: '[[x]]' }
        },
        children: [
          { id: 1, name: 'head', query: 'head' },
          { id: 2, name: 'body', query: 'body' }
        ]
      }
    }
    assert.deepEqual(props, expected);
  });

  it(`page w/ dynamic value 5`, async () => {
    const doc = await getDoc(pre, `<html v=[[x]]></html>`);
    const { props, errors } = loadPage(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    const expected: PageProps = {
      root: {
        id: 0, name: 'page', query: 'html',
        values: {
          attr_v: { val: '[[x]]' }
        },
        children: [
          { id: 1, name: 'head', query: 'head' },
          { id: 2, name: 'body', query: 'body' }
        ]
      }
    }
    assert.deepEqual(props, expected);
  });

  it(`page w/ static value`, async () => {
    const doc = await getDoc(pre, `<html v="x"></html>`);
    const { props, errors } = loadPage(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html v="x" ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    const expected: PageProps = {
      root: {
        id: 0, name: 'page', query: 'html',
        children: [
          { id: 1, name: 'head', query: 'head' },
          { id: 2, name: 'body', query: 'body' }
        ]
      }
    }
    assert.deepEqual(props, expected);
  });

  it(`dynamic attributes should imply local scope`, async () => {
    const doc = await getDoc(pre, `<html>
      <body>
        <div :v="x"/>
        <div :v=[[x]]/>
        <div :v="[[x]]"/>
        <div v="[[x]]"/>
        <div v=[[x]]/>
        <div v="x"/>
      </body>
    </html>`);
    const { props, errors } = loadPage(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      normalizeText(doc.toString()),
      normalizeText(`<html ${DOM_ID_ATTR}="0">
        <head ${DOM_ID_ATTR}="1"></head><body ${DOM_ID_ATTR}="2">
          <div ${DOM_ID_ATTR}="3"></div>
          <div ${DOM_ID_ATTR}="4"></div>
          <div ${DOM_ID_ATTR}="5"></div>
          <div ${DOM_ID_ATTR}="6"></div>
          <div ${DOM_ID_ATTR}="7"></div>
          <div v="x"></div>
        </body>
      </html>`)
    );
    const expected: PageProps = {
      root: {
        id: 0, name: 'page', query: 'html',
        children: [
          { id: 1, name: 'head', query: 'head' },
          { id: 2, name: 'body', query: 'body', children: [
            { id: 3, query: `[${DOM_ID_ATTR}="3"]`, values: {
              v: { val: 'x' }
            } }, { id: 4, query: `[${DOM_ID_ATTR}="4"]`, values: {
              v: { val: '[[x]]' }
            } }, { id: 5, query: `[${DOM_ID_ATTR}="5"]`, values: {
              v: { val: '[[x]]' }
            } }, { id: 6, query: `[${DOM_ID_ATTR}="6"]`, values: {
              attr_v: { val: '[[x]]' }
            } }, { id: 7, query: `[${DOM_ID_ATTR}="7"]`, values: {
              attr_v: { val: '[[x]]' }
            } }
          ] }
        ]
      }
    }
    assert.deepEqual(props, expected);
  });

  it(`should collect and mark dynamic texts`, async () => {
    const doc = await getDoc(pre, `<html>
      <body>
        [[v[0]]], [[name]]!
      </body>
    </html>`);
    const { props, errors } = loadPage(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      normalizeText(doc.toString()),
      normalizeText(`<html ${DOM_ID_ATTR}="0">
        <head ${DOM_ID_ATTR}="1"></head><body ${DOM_ID_ATTR}="2">
        <!---t0--><!---/-->, <!---t1--><!---/-->!
        </body>
      </html>`)
    );
    const expected: PageProps = {
      root: {
        id: 0, name: 'page', query: 'html',
        children: [
          { id: 1, name: 'head', query: 'head' },
          { id: 2, name: 'body', query: 'body', values: {
            __t0: { val: '[[v[0]]]' },
            __t1: { val: '[[name]]' }
          } }
        ]
      }
    }
    assert.deepEqual(props, expected);
  });

  it(`dynamic texts should use closest outer scope`, async () => {
    const doc = await getDoc(pre, `<html>
      <body>
        <span><b>hello [[name]]!</b></span>
        <div :aka="theDiv"><i>[[greeting]] [[name]]</i></div>
        <pre :aka="thePre">ciao [[name]]!</pre>
      </body>
    </html>`);
    const { props, errors } = loadPage(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      normalizeText(doc.toString()),
      normalizeText(`<html ${DOM_ID_ATTR}="0">
        <head ${DOM_ID_ATTR}="1"></head><body ${DOM_ID_ATTR}="2">
          <span><b>hello <!---t0--><!---/-->!</b></span>
          <div ${DOM_ID_ATTR}="3"><i><!---t0--><!---/--> <!---t1--><!---/--></i></div>
          <pre ${DOM_ID_ATTR}="4">ciao <!---t0--><!---/-->!</pre>
        </body>
      </html>`)
    );
    const expected: PageProps = {
      root: {
        id: 0, name: 'page', query: 'html',
        children: [{
          id: 1, name: 'head', query: 'head'
        }, {
          id: 2, name: 'body', query: 'body', values: {
            __t0: { val: '[[name]]' }
          }, children: [{
            id: 3, name: 'theDiv', query: `[${DOM_ID_ATTR}="3"]`, values: {
              __t0: { val: '[[greeting]]' },
              __t1: { val: '[[name]]' }
            }
          }, {
            id: 4, name: 'thePre', query: `[${DOM_ID_ATTR}="4"]`, values: {
              __t0: { val: '[[name]]' }
            }
          }]
        }]
      }
    }
    assert.deepEqual(props, expected);
  });

  it(`hyphenToCamel()`, () => {
    assert.equal(hyphenToCamel('data-dummy'), 'dataDummy');
    assert.equal(hyphenToCamel('attr_data-dummy'), 'attr_dataDummy');
    assert.equal(hyphenToCamel('attr_data-dummy-data'), 'attr_dataDummyData');
  });
});
