import { assert } from "chai";
const md = require('markdown-it')();

describe('preprocessor: markdown-it', () => {

  it(`should render simple markdown`, () => {
    assert.equal(
      md.render('# markdown-it rulezz!'),
      '<h1>markdown-it rulezz!</h1>\n'
    );
  });

  it(`should allow HTML tags`, () => {
    md.set({ html: true });
    assert.equal(
      md.render(`some tags: <span>hi</span>`),
      '<p>some tags: <span>hi</span></p>\n'
    );
  });

  it('should allow `:`-attributes and multilines values', () => {
    md.set({ html: true });
    assert.equal(
      md.render(`some tags: <span :x="[[
        0
      ]]">hi</span>`),
      '<p>some tags: <span :x="[[\n        0\n      ]]">hi</span></p>\n'
    );
  });

  it(`should support syntax coloring`, () => {
    md.use(require('markdown-it-highlightjs'));
    assert.equal(
      md.render(
        '```html\n' +
        '<html lang="en">\n' +
        '</html>\n' +
        '```\n'
      ),
      '<pre><code class=\"hljs language-html\">' +
      '<span class=\"hljs-tag\">&lt;<span class=\"hljs-name\">html</span> ' +
      '<span class=\"hljs-attr\">lang</span>=<span class=\"hljs-string\">&quot;en&quot;</span>&gt;</span>\n' +
      '<span class=\"hljs-tag\">&lt;/<span class=\"hljs-name\">html</span>&gt;</span>\n' +
      '</code></pre>\n'
    );
  });

});
