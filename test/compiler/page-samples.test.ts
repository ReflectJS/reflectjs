import { assert } from "chai";
import { GlobalWindow } from "happy-dom";
import { compileDoc, PageError } from "../../src/compiler/page-compiler";
import { HtmlDocument } from "../../src/preprocessor/htmldom";
import Preprocessor from "../../src/preprocessor/preprocessor";
import { normalizeSpace, normalizeText } from "../../src/preprocessor/util";
import { EVENT_ATTR_PREFIX, HANDLER_ATTR_PREFIX, OUTER_PROPERTY, Page } from "../../src/runtime/page";

const rootPath = process.cwd() + '/test/compiler/page-samples';

describe(`compiler: page-samples`, () => {

  it(`hyphen attribute name`, async () => {
    const html = `<html data-dummy=[['']]></html>`;
    const test = await loadTestPage(rootPath, 'sample1.html', html);

    assert.exists(test.js);
    assert.equal(
      normalizeSpace(test.js),
      normalizeSpace(`{ root: {
        id: '0', name: 'page',
        values: {
          attr_dataDummy: {
            fn: function () { return ''; },
            val: null
          }
        },
        children: [
          { id: '1', name: 'head' },
          { id: '2', name: 'body' }
        ]
      } }`)
    );

    assert.exists(test.page);
    test.page?.doc.head.remove();
    test.page?.doc.body.remove();
    assert.equal(
      cleanTestPage(test.page?.getMarkup()),
      cleanTestPage(`<html></html>`)
    );

    test.page?.refresh();
    assert.equal(
      cleanTestPage(test.page?.getMarkup()),
      cleanTestPage(`<html data-dummy=""></html>`)
    );
  });

  it(`dependent attribute value`, async () => {
    const html = `<html lang=[[v]] :v="en"></html>`;
    const page = (await loadTestPage(rootPath, 'sample1.html', html)).page as Page;

    assert.exists(page);
    page.doc.head.remove();
    page.doc.body.remove();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html></html>`)
    );

    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html lang="en"></html>`)
    );

    page.root.proxy['v'] = 'es';
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html lang="es"></html>`)
    );

    page.root.proxy['v'] = null;
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html></html>`)
    );
  });

  it(`function value 1`, async () => {
    const html = `<html lang=[[v()]] :v=[[() => 'en']]></html>`;
    const page = (await loadTestPage(rootPath, 'sample1.html', html)).page as Page;

    assert.exists(page);
    page.doc.head.remove();
    page.doc.body.remove();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html></html>`)
    );

    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html lang="en"></html>`)
    );
  });

  it(`function value 2`, async () => {
    const html = `<html lang=[[v()]] :v=[[() => x + y]] :x="e" :y="n"></html>`;
    const res = await loadTestPage(rootPath, 'sample1.html', html);
    assert.equal(res.errors?.length, 0);
    const page = res.page as Page;

    assert.exists(page);
    page.doc.head.remove();
    page.doc.body.remove();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html></html>`)
    );

    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html lang="en"></html>`)
    );
  });

  it(`function value 3`, async () => {
    const html = `<html lang=[[v()]] :v=[[function() { return x + y; }]] :x="e" :y="n"></html>`;
    const res = await loadTestPage(rootPath, 'sample1.html', html);
    assert.equal(res.errors?.length, 0);
    res.page?.doc.head.remove();
    res.page?.doc.body.remove();
    res.page?.refresh();
    assert.equal(
      cleanTestPage(res.page?.getMarkup()),
      cleanTestPage(`<html lang="en"></html>`)
    );
  });

  it(`function value 4`, async () => {
    const html = `<html :v=[[function() { return x + y; }]] :x="e" :y="n">
      <body lang=[[v()]]/>
    </html>`;
    const res = await loadTestPage(rootPath, 'sample1.html', html);
    assert.equal(res.errors?.length, 0);
    res.page?.doc.head.remove();
    res.page?.refresh();
    assert.equal(
      cleanTestPage(res.page?.getMarkup()),
      cleanTestPage(`<html>
        <body lang="en"></body>
      </html>`)
    );
  });

  it(`function value 5`, async () => {
    const html = `<html :f=[[function() { return v; }]] :v="in html">
      <body result=[[f()]] :v="in body"/>
    </html>`;
    const res = await loadTestPage(rootPath, 'sample1.html', html);
    assert.equal(res.errors?.length, 0);
    res.page?.doc.head.remove();
    res.page?.refresh();
    // `f` must behave as a method of `html`, so it must take `html`'s `v`
    // (and not `body`'s)
    assert.equal(
      cleanTestPage(res.page?.getMarkup()),
      cleanTestPage(`<html>
        <body result="in html"></body>
      </html>`)
    );
  });

  it(`function value 6`, async () => {
    const html = `<html :f=[[function(that) { return that.v; }]] :v="in html">
      <body result=[[f(this)]] :v="in body"/>
    </html>`;
    const res = await loadTestPage(rootPath, 'sample1.html', html);
    assert.equal(res.errors?.length, 0);
    res.page?.doc.head.remove();
    res.page?.refresh();
    assert.equal(
      cleanTestPage(res.page?.getMarkup()),
      cleanTestPage(`<html>
        <body result="in body"></body>
      </html>`)
    );
  });

  it(`function value 7`, async () => {
    const html = `<html :f=[[(that) => that.v]] :v="in html">
      <body result=[[f(this)]] :v="in body"/>
    </html>`;
    const res = await loadTestPage(rootPath, 'sample1.html', html);
    assert.equal(res.errors?.length, 0);
    res.page?.doc.head.remove();
    res.page?.refresh();
    assert.equal(
      cleanTestPage(res.page?.getMarkup()),
      cleanTestPage(`<html>
        <body result="in body"></body>
      </html>`)
    );
  });

  it(`event value`, async () => {
    const html = `<html>
      <body :${EVENT_ATTR_PREFIX}click=[[function(ev) { v = ev.type }]] :v="">[[v]]</body>
    </html>`;
    const page = (await loadTestPage(rootPath, 'sample1.html', html)).page as Page;

    assert.exists(page);
    page.doc.head.remove();
    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
        <body><!---t0--><!---/--></body>
      </html>`)
    );

    page.doc.querySelector('body')?.click();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
        <body><!---t0-->click<!---/--></body>
      </html>`)
    );
  });

  it(`sample 1 - "Augmented HTML" from aremel.org`, async () => {
    const page = (await loadTestPage(rootPath, 'sample.html', `<html>
      <body :v=[[10]]>
        <button :on_click=[[() => v--]]>-</button>
        [[v]]
        <button :on_click=[[() => v++]]>+</button>
      </body>
    </html>`)).page as Page;
    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body>
        <button>-</button>
        <!---t0-->10<!---/-->
        <button>+</button>
      </body>
      </html>`)
    );
    page.doc.querySelector('button')?.click();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body>
        <button>-</button>
        <!---t0-->9<!---/-->
        <button>+</button>
      </body>
      </html>`)
    );
  });

  it(`sample 2 - "Reusability" from aremel.org`, async () => {
    const page = (await loadTestPage(rootPath, 'sample.html', `<html>
      <body>
        <:define tag="app-product" :name :price>
          <b>Product: [[name]]</b>
          <div>Price: [[price]]</div>
          <p/>
        </:define>
    
        <app-product :name="Thingy" :price="1$"/>
        <app-product :name="Widget" :price="2$"/>
        <app-product :name="Gadget" :price="3$"/>
      </body>
    </html>`)).page as Page;
    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body>
        <div>
          <b>Product: <!---t0-->Thingy<!---/--></b>
          <div>Price: <!---t1-->1$<!---/--></div>
          <p></p>
        </div>
        <div>
          <b>Product: <!---t0-->Widget<!---/--></b>
          <div>Price: <!---t1-->2$<!---/--></div>
          <p></p>
        </div>
        <div>
          <b>Product: <!---t0-->Gadget<!---/--></b>
          <div>Price: <!---t1-->3$<!---/--></div>
          <p></p>
        </div>
      </body>
      </html>`)
    );
  });

  it(`sample 3/4 - "Reactivity/Isomorphism" from aremel.org`, async () => {
    const page = (await loadTestPage(rootPath, 'sample.html', `<html>
      <body :count=[[0]] data-test=[[false]]
            :${HANDLER_ATTR_PREFIX}count=[[
              !count && window.setTimeout(() => count++, 0);
              attr_dataTest = true;
            ]]>
        Seconds: [[count]]
      </body>
    </html>`)).page as Page;
    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body data-test="true">
        Seconds: <!---t0-->0<!---/-->
      </body>
      </html>`)
    );
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body data-test="true">
        Seconds: <!---t0-->1<!---/-->
      </body>
      </html>`)
    );
  });

  it(`data binding 1 - data reference`, async () => {
    const page = (await loadTestPage(rootPath, 'sample.html', `<html>
      <body :data=[[{ id: 1, name: 'Alice' }]]>
        id: [[data.id]], name: [[data.name]]
      </body>
    </html>`)).page as Page;
    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body>
        id: <!---t0-->1<!---/-->, name: <!---t1-->Alice<!---/-->
      </body>
      </html>`)
    );
    page.root.proxy['body'].data = { id: 2, name: 'Bob' };
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body>
        id: <!---t0-->2<!---/-->, name: <!---t1-->Bob<!---/-->
      </body>
      </html>`)
    );
  });

  it(`data binding 2 - data refinement`, async () => {
    const res = (await loadTestPage(rootPath, 'sample.html', `<html>
      <body :data=[[{ id: 1, name: 'Alice' }]]>
        <span :data=[[data.name]]>[[data]]</span>
      </body>
    </html>`));
    const js = res.js;
    assert.equal(normalizeSpace(js), normalizeSpace(`{
      root: {
        id: '0',
        name: 'page',
        children: [
          { id: '1', name: 'head' },
          { id: '2', name: 'body',
            values: {
              data: {
                fn: function () { return { id: 1, name: 'Alice' }; },
                val: null
              }
            },
            children: [{ id: '3',
              values: {
                __t0: {
                  fn: function () { return this.data; },
                  val: null,
                  refs: ['data']
                },
                data: {
                  fn: function () { return this.${OUTER_PROPERTY}.data.name; },
                  val: null,
                  refs: ['data']
                }
              }
            }]
          }
        ]
      }
    }`));
    const page = res.page as Page;
    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body>
        <span><!---t0-->Alice<!---/--></span>
      </body>
      </html>`)
    );
    page.root.proxy['body'].data = { id: 2, name: 'Bob' };
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body>
        <span><!---t0-->Bob<!---/--></span>
      </body>
      </html>`)
    );
  });

  it(`data binding 3 - replication`, async () => {
    const res = (await loadTestPage(rootPath, 'sample.html', `<html>
      <body :data=[[{ list: [1, 2, 3] }]]>
        <ul>
          <li :data=[[data.list]]>[[data]]</li>
        </ul>
      </body>
    </html>`));
    assert.equal(
      normalizeSpace(res.js),
      normalizeSpace(`{
        root: {
          id: '0',
          name: 'page',
          children: [
            {
              id: '1',
              name: 'head'
            },
            {
              id: '2',
              name: 'body',
              values: {
                data: {
                  fn: function () { return { list: [ 1, 2, 3 ] }; },
                  val: null
                }
              },
              children: [{
                id: '3',
                values: {
                  __t0: {
                    fn: function () { return this.data; },
                    val: null,
                    refs: ['data']
                  },
                  data: {
                    fn: function () { return this.__outer.data.list; },
                    val: null,
                    refs: ['data']
                  }
                }
              }]
            }
          ]
        }
      }`)
    );

    const page = res.page as Page;
    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body>
        <ul>
          <li><!---t0-->1<!---/--></li><li><!---t0-->2<!---/--></li><li><!---t0-->3<!---/--></li>
        </ul>
      </body>
      </html>`)
    );

    page.root.proxy['body'].data = { list: ['a', 'b'] };
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body>
        <ul>
          <li><!---t0-->a<!---/--></li><li><!---t0-->b<!---/--></li>
        </ul>
      </body>
      </html>`)
    );

    page.root.proxy['body'].data = {};
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head><body>
        <ul>
          <li><!---t0--><!---/--></li>
        </ul>
      </body>
      </html>`)
    );
  });

  it(`sample 5 - "Data binding" from aremel.org`, async () => {
    const page = (await loadTestPage(rootPath, 'sample.html', `<html>
      <head></head>
      <body>
        <div :aka="listData" :content=[[{"list":[
            {"name":"Inbox", "count":3},
            {"name":"Drafts", "count":null},
            {"name":"Sent", "count":null},
            {"name":"Junk", "count":1}
        ]}]]/>
        <ul>
          <li :data=[[listData.content.list]]>
            [[data.name]] ([[data.count]])
          </li>
        </ul>
      </body>
    </html>`)).page as Page;
    //FIXME: this logs exceptions
    page.refresh();
    assert.equal(
      cleanTestPage(page.getMarkup()),
      cleanTestPage(`<html>
      <head></head>
      <body>
        <div></div>
        <ul>
          <li>
            <!---t0-->Inbox<!---/--> (<!---t1-->3<!---/-->)
          </li><li>
            <!---t0-->Drafts<!---/--> (<!---t1--><!---/-->)
          </li><li>
            <!---t0-->Sent<!---/--> (<!---t1--><!---/-->)
          </li><li>
            <!---t0-->Junk<!---/--> (<!---t1-->1<!---/-->)
          </li>
        </ul>
      </body>
      </html>`)
    );
  });

});

// =============================================================================
// util
// =============================================================================

export type TestPage = {
  pre: Preprocessor,
  doc?: HtmlDocument,
  js?: string,
  errors?: PageError[],
  page?: Page
};

export async function loadTestPage(rootPath: string, fname: string, src?: string): Promise<TestPage> {
  const ret: TestPage = {
    pre: new Preprocessor(rootPath, (src ? [{
      fname: fname,
      content: src
    }] : undefined))
  };
  ret.doc = await ret.pre.read(fname);
  if (ret.doc) {
    const { js, errors } = compileDoc(ret.doc);
    ret.js = js;
    ret.errors = errors;
    if (errors.length == 0) {
      const props = eval(`(${js})`);
      const win = new GlobalWindow();
      win.document.write(ret.doc.toString());
      const root = win.document.documentElement as unknown as Element;
      ret.page = new Page(win as any, root, props);
    }
  }
  return ret;
}

export function cleanTestPage(s?: string) {
  if (s == null) {
    return undefined;
  }
  s = s.replace('<!DOCTYPE html>', '');
  s = s.replace(/(\s+data-reflectjs=".*?")/g, '');
  return normalizeText(s);
}
