import { assert } from "chai";
import { compileDoc } from "../../src/compiler/page-compiler";
import { HtmlDocument } from "../../src/preprocessor/htmldom";
import Preprocessor from "../../src/preprocessor/preprocessor";
import { normalizeSpace } from "../../src/preprocessor/util";
import { DOM_ID_ATTR } from "../../src/runtime/page";

const pre = new Preprocessor(process.cwd() + '/test/compiler/page-compiler');

describe("compiler: page-compiler", () => {

  it(`empty page`, async () => {
    const doc = await getDoc(pre, `<html></html>`);
    const { js, errors } = compileDoc(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    assert.equal(
      normalizeSpace(js),
      normalizeSpace(`{ root: {
        id: '0', name: 'page',
        children: [
          { id: '1', name: 'head' },
          { id: '2', name: 'body' }
        ]
      } }`)
    );
  });

  it(`basic page`, async () => {
    const doc = await getDoc(pre, `<html lang=[[l]] :l="en"></html>`);
    const { js, errors } = compileDoc(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    assert.equal(
      normalizeSpace(js),
      normalizeSpace(`{ root: {
        id: '0', name: 'page',
        values: {
          attr_lang: {
            fn: function () {
              return this.l;
            },
            val: null,
            refs: ['l']
          },
          l: {
            val: 'en'
          }
        },
        children: [
          { id: '1', name: 'head' },
          { id: '2', name: 'body' }
        ]
      } }`)
    );
  });

  it(`function value`, async () => {
    const doc = await getDoc(pre, `<html :myfun=[[function(s) { return s.trim() + x; }]]></html>`);
    const { js, errors } = compileDoc(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    assert.equal(
      normalizeSpace(js),
      normalizeSpace(`{ root: {
        id: '0', name: 'page',
        values: {
          myfun: {
            val: function (s) { return s.trim() + this.x; },
            passive: true
          }
        },
        children: [
          { id: '1', name: 'head' },
          { id: '2', name: 'body' }
        ]
      } }`)
    );
  });

  it(`arrow function value`, async () => {
    const doc = await getDoc(pre, `<html :myfun=[[(s) => s.trim()]]></html>`);
    const { js, errors } = compileDoc(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">` +
      `<head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2"></body>` +
      `</html>`
    );
    assert.equal(
      normalizeSpace(js),
      normalizeSpace(`{ root: {
        id: '0', name: 'page',
        values: {
          myfun: {
            val: function (s) { return s.trim(); },
            passive: true
          }
        },
        children: [
          { id: '1', name: 'head' },
          { id: '2', name: 'body' }
        ]
      } }`)
    );
  });

  it(`dynamic text in style tag`, async () => {
    const doc = await getDoc(pre, `<html>\n` +
      `<head>\n` +
        `<style>\n` +
          `body {\n` +
            `color: [[fg]];\n` +
            `background: [[bg]];\n` +
            `margin: [[mgPx]]px;\n` +
          `}\n` +
        `</style>\n` +
      `</head>\n` +
      `<body></body>\n` +
    `</html>`);
    const { js, errors } = compileDoc(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      doc.toString(),
      `<html ${DOM_ID_ATTR}="0">\n` +
      `<head ${DOM_ID_ATTR}="1">\n<style data-trillo-text="0"></style>\n</head>\n` +
      `<body ${DOM_ID_ATTR}="2"></body>\n` +
      `</html>`
    );
    assert.equal(
      normalizeSpace(js),
      normalizeSpace(`{ root: {
        id: '0', name: 'page',
        children: [
          { id: '1', name: 'head', values: {
            __t0: {
              fn: function () {
                return '\\nbody {\\ncolor: ' + this.___nn(this.fg) + ';\\nbackground: ' + this.___nn(this.bg) + ';\\nmargin: ' + this.___nn(this.mgPx) + 'px;\\n}\\n';
              },
              val: null,
              refs: [ 'fg', 'bg', 'mgPx' ]
            }
          } },
          { id: '2', name: 'body' }
        ]
      } }`)
    );
  });

  it(`indirect dependency`, async () => {
    const doc = await getDoc(pre, `<html>
      <body :v2=[[scope1.scope2.v1]]>
        <div :aka="scope1">
          <div :aka="scope2" :v1=[[1]]></div>
        </div>
      </body>
    </html>`);
    const { js, errors } = compileDoc(doc);
    assert.equal(errors.length, 0);
    assert.equal(
      normalizeSpace(doc.toString()),
      normalizeSpace(`<html ${DOM_ID_ATTR}="0">
      <head ${DOM_ID_ATTR}="1"></head>` +
      `<body ${DOM_ID_ATTR}="2">
        <div ${DOM_ID_ATTR}="3">
          <div ${DOM_ID_ATTR}="4"></div>
        </div>
      </body>
      </html>`)
    );
    assert.equal(
      normalizeSpace(js),
      normalizeSpace(`{ root: {
        id: '0', name: 'page',
        children: [
          { id: '1', name: 'head' },
          { id: '2', name: 'body', values: {
              v2: {
                fn: function () { return this.scope1.scope2.v1; },
                val: null,
                refs: [ 'scope1', 'scope1.scope2', 'scope1.scope2.v1' ]
              }
            }, children: [{ id: '3', name: 'scope1', children: [{ id: '4', name: 'scope2', values: {
                v1: {
                  fn: function () { return 1; },
                  val: null
                }
            } }]
          }] }
        ]
      } }`)
    );
  });
});

// =============================================================================
// util
// =============================================================================

export async function getDoc(pre: Preprocessor, s: string): Promise<HtmlDocument> {
  var prepro = new Preprocessor(pre.rootPath, [{
    fname: 'index.html',
    content: s
  }]);
  const ret = await prepro.read('index.html');
  return ret as HtmlDocument;
}
