import { Window, XMLParser } from "happy-dom";
import { HtmlDocument } from "../preprocessor/htmldom";
import * as page from "../runtime/page";
import * as scope from "../runtime/scope";
import * as value from "../runtime/value";
import * as es from "estree";
import { generate } from "escodegen";

export interface PageError {
  type: 'err' | 'warn';
}

export function compileDoc(doc: HtmlDocument) {
  const errors: PageError[] = [];
  const page = loadPage(doc);
  const ast = compilePage(page, errors);
  const js = generate(ast);
  return { page, js, errors };
}

function loadPage(doc: HtmlDocument): page.Page {
  const props = {
    root: {
      id: 0, name: page.ROOT_SCOPE_NAME, query: 'html',
      children: [
        { id: 1, name: page.HEAD_SCOPE_NAME, query: 'head' },
        { id: 2, name: page.BODY_SCOPE_NAME, query: 'body' }
      ]
    }
  };
  const win = new Window();
  const dom = XMLParser.parse(win.document, doc.toString());
  const ret = new page.Page(win, dom.firstElementChild as unknown as Element, props);
  return ret;
}

/**
 * @see page.PageProps
 */
function compilePage(page: page.Page, errors: PageError[]) {
  const props: es.Property[] = [];
  props.push(makeProperty('root', compileScope(page.root, errors)));
  return {
    type: 'ObjectExpression',
    properties: props
  } as es.ObjectExpression;
}

/**
 * @see scope.ScopeProps
 */
function compileScope(scope: scope.Scope, errors: PageError[]) {
  const src = scope.props;
  const dst: es.Property[] = [];
  dst.push(makeProperty('id', { type: 'Literal', value: scope.props.id }));
  src.name && dst.push(makeProperty('name', { type: 'Literal', value: src.name }));
  src.query && dst.push(makeProperty('query', { type: 'Literal', value: src.query }));
  src.markup && dst.push(makeProperty('markup', { type: 'Literal', value: src.markup }));
  src.values && dst.push(makeProperty('values', compileValues(src.values, errors)));
  src.children && dst.push(makeProperty('children', compileScopes(scope, errors)));
  return {
    type: 'ObjectExpression',
    properties: dst
  } as es.ObjectExpression;
}

function compileScopes(parent: scope.Scope, errors: PageError[]) {
  const dst: es.ObjectExpression[] = [];
  parent.children?.forEach(child => {
    dst.push(compileScope(child, errors));
  });
  return {
    type: "ArrayExpression",
    elements: dst
  } as es.ArrayExpression;
}

function compileValues(values: value.ValueProps[], errors: PageError[]) {
  const dst: es.Property[] = [];
  values.forEach(valueProps => {
    dst.push(makeProperty(valueProps.key, compileValue(valueProps, errors)));
  });
  return {
    type: 'ObjectExpression',
    properties: dst
  } as es.ObjectExpression;
}

/**
 * @see value.ValueProps
 */
function compileValue(value: value.ValueProps, errors: PageError[]) {
  const dst: es.Property[] = [];
  //TODO
  return {
    type: 'ObjectExpression',
    properties: dst
  } as es.ObjectExpression;
}

// =============================================================================
// util
// =============================================================================

function makeProperty(name: string, value: es.Expression | es.Literal): es.Property {
  return {
    type: "Property",
    kind: "init",
    computed: false,
    shorthand: false,
    method: false,
    key: { type: "Identifier", name: name },
    value: value
  };
}
