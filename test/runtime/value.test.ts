import { assert } from "chai";
import { TEXT_VALUE_PREFIX } from "../../src/runtime/page";
import { ScopeProps } from "../../src/runtime/scope";
import { Value } from "../../src/runtime/value";
import { addScope, baseApp, itemAt } from "./page.test";

describe('value', () => {

  it('should create a logic value', () => {
    const page = baseApp(props => {
      const body = itemAt(1, props.root.children) as ScopeProps;
      body.values = [{
        key: 'v',
        val: 1
      }];
    });
    const v = page.root.children[1]?.values['v'];
    assert.isUndefined(v.key);
    assert.equal(v.props.val, 1);
    assert.isUndefined(v.dom);
    assert.isUndefined(v.cb);
  });

  it('should create a DOM attribute value', () => {
    const page = baseApp(props => {
      const body = itemAt(1, props.root.children) as ScopeProps;
      body.values = [{
        key: 'attr_class',
        val: 'base'
      }];
    });
    const v = page.root.children[1]?.values['attr_class'];
    assert.equal(v.key, 'class');
    assert.equal(v.props.val, 'base');
    assert.equal(v.dom, page.root.children[1]?.dom);
    assert.equal(v.cb, Value.attrCB);
  });

  it('should create a DOM text value', () => {
    const page = baseApp(props => {
      addScope(props, [1], {
        id: 3,
        markup: `<span>Hello <!---t0--><!---/-->!</span>`,
        values: [{
          key: TEXT_VALUE_PREFIX + '0',
          val: 'there'
        }]
      });
    });
    const body = page.root.children[1];
    const span = body.children[0];
    const v = span.values[TEXT_VALUE_PREFIX + '0'];
    assert.isUndefined(v.key);
    assert.equal(v.props.val, 'there');
    assert.equal(v.dom, itemAt(0, span.texts));
    assert.equal(v.cb, Value.textCB);
    assert.equal(
      page.getMarkup(),
      `<!DOCTYPE html><html data-rsj=\"0\">` +
      `<head data-rsj=\"1\"></head><body data-rsj=\"2\">` +
      `<span data-rsj=\"3\">Hello <!---t0--><!---/-->!</span>` +
      `</body></html>`
    );
    page.refresh();
    assert.equal(
      page.getMarkup(),
      `<!DOCTYPE html><html data-rsj=\"0\">` +
      `<head data-rsj=\"1\"></head><body data-rsj=\"2\">` +
      `<span data-rsj=\"3\">Hello <!---t0-->there<!---/-->!</span>` +
      `</body></html>`
    );
  });

  it('should update dependent value', () => {
    const page = baseApp(props => {
      const body = itemAt(1, props.root.children) as ScopeProps;
      body.values = [{
        key: 'v1', val: 1
      }, {
        key: 'v2', val: undefined,
        fn: function() { return this.v1 + 1; },
        refs: ['v1']
      }];
    });
    const body = page.root.children[1];
    const v1 = body.values['v1'];
    assert.equal(v1.props.val, 1);
    assert.isUndefined(v1.src);
    assert.isUndefined(v1.dst);
    const v2 = body.values['v2'];
    assert.isUndefined(v2.props.val);
    assert.isUndefined(v2.src);
    assert.isUndefined(v2.dst);
    // by refreshing, the dependent value is updated
    page.refresh();
    assert.equal(v1.props.val, 1);
    assert.equal(v2.props.val, 2);
    // and it gets linked to the upstream value
    // so when that one changes, it changes too
    body.proxy['v1'] = 5;
    assert.equal(v1.props.val, 5);
    assert.equal(v2.props.val, 6);
    // if it's set explicitly
    body.proxy['v2'] = 100;
    assert.equal(v1.props.val, 5);
    assert.equal(v2.props.val, 100);
    // it then becomes independent
    body.proxy['v1'] = 10;
    assert.equal(v1.props.val, 10);
    assert.equal(v2.props.val, 100);
  });

});
