import { assert } from "chai";
import { ScopeProps } from "../../src/runtime/scope";
import { addScope, baseApp } from "./page.test";

describe('scope', () => {

  it('should create an attribute value', () => {
    const page = baseApp(props => {
      const body = props.root.children?.at(1) as ScopeProps;
      body.values = [{
        key: 'attr_class',
        val: 'base'
      }];
    });
    // assert.equal(
    //   page.markup,
    //   `<html data-rsj="0">` +
    //   `<head data-rsj="1"></head>` +
    //   `<body data-rsj="2" class="base"></body>` +
    //   `</html>`
    // );
  });

});
