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
          val: 'a text'
        }]
      });
    });
    const body = page.root.children[1];
    const span = body.children[0];
    const v = span.values[TEXT_VALUE_PREFIX + '0'];
    assert.isUndefined(v.key);
    assert.equal(v.props.val, 'a text');
    assert.equal(v.dom, itemAt(0, span.texts));
    assert.equal(v.cb, Value.textCB);
  });

});
