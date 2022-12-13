import { assert } from "chai";
import { ELEMENT_NODE } from "../../src/preprocessor/dom";
import { HtmlElement, HtmlNode } from "../../src/preprocessor/htmldom";
import HtmlParser from "../../src/preprocessor/htmlparser";
import { normalizeText } from "../../src/preprocessor/util";

describe('htmldom', () => {

  it(`nextSibling`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body></body></html>`);
    assert.equal(doc.head?.nextSibling, doc.body);
  });

  it(`classList.remove()`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body class="alice"></body></html>`);
    doc.body?.classList.add('bob');
    assert.equal(doc.body?.outerHTML, `<body class="alice bob"></body>`);
    doc.body?.classList.remove('bob');
    assert.equal(doc.body?.outerHTML, `<body class="alice"></body>`);
  });

  it(`style.removeProperty()`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body style="display: block;"></body></html>`);
    doc.body?.style.setProperty('color', 'red');
    assert.equal(doc.body?.outerHTML, `<body style="display: block;color:red;"></body>`);
    doc.body?.style.removeProperty('color');
    assert.equal(doc.body?.outerHTML, `<body style="display: block;"></body>`);
  });

  it(`removeChild()`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body></body></html>`);
    doc.firstElementChild?.removeChild(doc.body as HtmlElement);
    assert.equal(doc.toString(), `<html><head></head></html>`);
  });

  it(`firstChild`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body></body></html>`);
    const e = doc.firstElementChild?.firstChild;
    assert.equal(e, doc.head);
  });

  it(`childElementCount`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body></body></html>`);
    const e = doc.firstElementChild?.firstChild;
    assert.equal(doc.firstElementChild?.childElementCount, 2);
  });

  it(`previousElementSibling`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body></body></html>`);
    const e = doc.body?.previousElementSibling;
    assert.equal(e, doc.head);
  });

  it(`nextElementSibling`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body></body></html>`);
    const e = doc.head?.nextElementSibling;
    assert.equal(e, doc.body);
  });

  it(`childNodes.item()`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body></body></html>`);
    const e = doc.firstElementChild?.childNodes.item(1);
    assert.equal(e, doc.body);
  });

  it(`set innerHTML w/ existing nodes`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body>hi <b>there</b></body></html>`);
    const body = doc.body as HtmlElement;
    body.innerHTML = '<i>hi</i> everybody'
    assert.equal(doc.toString(), `<html><head></head><body><i>hi</i> everybody</body></html>`);
  });

  it(`set innerText w/ existing text`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body>hello</body></html>`);
    const body = doc.body as HtmlElement;
    body.innerText = 'hi';
    assert.equal(doc.toString(), `<html><head></head><body>hi</body></html>`);
  });

  it(`set innerText w/ existing nodes`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body>hi <b>there</b></body></html>`);
    const body = doc.body as HtmlElement;
    body.innerText = 'hi everybody'
    assert.equal(doc.toString(), `<html><head></head><body>hi everybody</body></html>`);
  });

  it(`output w/ sorted attribute names`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body c="2" a="1" b="3"></body></html>`);
    assert.equal(doc.toString(true), `<html><head></head><body a="1" b="3" c="2"></body></html>`);
  });

  it(`add/remove event listener (dummy)`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body></body></html>`);
    const listener = () => {};
    doc.addEventListener('dummy', listener);
    doc.removeEventListener('dummy', listener);
  });

  it(`scan()`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body></body></html>`);
    const e = doc.scan(n => (n.nodeType === ELEMENT_NODE && n.tagName === 'BODY'), true);
    assert.equal(e, doc.body);
  });

  it(`Document.createElement()`, () => {
    const doc = HtmlParser.parse(`<html><head></head><body></body></html>`);
    const e = doc.createElement('span');
    doc.body?.appendChild(e);
    assert.equal(doc.toString(true), `<html><head></head><body><span></span></body></html>`);
  });

  it('clone', () => {
    const doc = HtmlParser.parse(`<html>
      <body>
        <section id="text">
          <header><h1>Text</h1></header>
          <article id="text__headings">
            <header>
              <h2>Headings</h2>
            </header>
            <div>
              <!-- headings -->
              <h1>Heading 1</h1>
              <h2>Heading 2</h2>
              <h3>Heading 3</h3>
              <h4>Heading 4</h4>
              <h5>Heading 5</h5>
              <h6>Heading 6</h6>
            </div>
            <footer><p><a href="#top">[Top]</a></p></footer>
          </article>
        </section>
      </body>
    </html>`);
    const html = doc.firstElementChild;
    const body = html?.firstElementChild;
    const orig = body?.firstElementChild;
    const copy = orig?.cloneNode(false);
    copy && body?.appendChild(copy);
    body?.appendChild(doc.createTextNode('\n'));
    orig?.setAttribute('id', 'origText');
    assert.equal(
      normalizeText(body?.outerHTML),
      normalizeText(`<body>
        <section id="origText">
          <header><h1>Text</h1></header>
          <article id="text__headings">
            <header>
              <h2>Headings</h2>
            </header>
            <div>
              <!-- headings -->
              <h1>Heading 1</h1>
              <h2>Heading 2</h2>
              <h3>Heading 3</h3>
              <h4>Heading 4</h4>
              <h5>Heading 5</h5>
              <h6>Heading 6</h6>
            </div>
            <footer><p><a href="#top">[Top]</a></p></footer>
          </article>
        </section>

        <section id="text"></section>
      </body>`)
    );
  });

  it('deep clone', () => {
    const doc = HtmlParser.parse(`<html>
      <body>
        <section id="text">
          <header><h1>Text</h1></header>
          <article id="text__headings">
            <header>
              <h2>Headings</h2>
            </header>
            <div>
              <!-- headings -->
              <h1>Heading 1</h1>
              <h2>Heading 2</h2>
              <h3>Heading 3</h3>
              <h4>Heading 4</h4>
              <h5>Heading 5</h5>
              <h6>Heading 6</h6>
            </div>
            <footer><p><a href="#top">[Top]</a></p></footer>
          </article>
        </section>
      </body>
    </html>`);
    const html = doc.firstElementChild;
    const body = html?.firstElementChild;
    const orig = body?.firstElementChild;
    const copy = orig?.cloneNode(true);
    copy && body?.appendChild(copy);
    body?.appendChild(doc.createTextNode('\n'));
    orig?.setAttribute('id', 'origText');
    assert.equal(
      normalizeText(body?.outerHTML),
      normalizeText(`<body>
        <section id="origText">
          <header><h1>Text</h1></header>
          <article id="text__headings">
            <header>
              <h2>Headings</h2>
            </header>
            <div>
              <!-- headings -->
              <h1>Heading 1</h1>
              <h2>Heading 2</h2>
              <h3>Heading 3</h3>
              <h4>Heading 4</h4>
              <h5>Heading 5</h5>
              <h6>Heading 6</h6>
            </div>
            <footer><p><a href="#top">[Top]</a></p></footer>
          </article>
        </section>

        <section id="text">
          <header><h1>Text</h1></header>
          <article id="text__headings">
            <header>
              <h2>Headings</h2>
            </header>
            <div>
              <!-- headings -->
              <h1>Heading 1</h1>
              <h2>Heading 2</h2>
              <h3>Heading 3</h3>
              <h4>Heading 4</h4>
              <h5>Heading 5</h5>
              <h6>Heading 6</h6>
            </div>
            <footer><p><a href="#top">[Top]</a></p></footer>
          </article>
        </section>
      </body>`)
    );
  });

});
