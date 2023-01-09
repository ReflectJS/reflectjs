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
      `<head ${DOM_ID_ATTR}="1">\n<style data-reflectjs-text="0"></style>\n</head>\n` +
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
