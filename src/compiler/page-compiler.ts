import { generate } from "escodegen";
import * as es from "estree";
import { HtmlDocument } from "../preprocessor/htmldom";
import { PageProps } from "../runtime/page";
import { ScopeProps } from "../runtime/scope";
import { ValueProps } from "../runtime/value";
import { loadPage } from "./page-preprocessor";

export interface PageError {
  type: 'err' | 'warn';
}

export function compileDoc(doc: HtmlDocument) {
  const { props, errors } = loadPage(doc);
  const ast = compilePage(props, errors);
  const js = generate(ast);
  return { js, errors };
}

/**
 * @see PageProps
 */
function compilePage(page: PageProps, errors: PageError[]) {
  const props: es.Property[] = [];
  props.push(makeProperty('root', compileScope(page.root, errors)));
  return {
    type: 'ObjectExpression',
    properties: props
  } as es.ObjectExpression;
}

/**
 * @see ScopeProps
 */
function compileScope(src: ScopeProps, errors: PageError[]) {
  const dst: es.Property[] = [];
  dst.push(makeProperty('id', { type: 'Literal', value: src.id }));
  src.name && dst.push(makeProperty('name', { type: 'Literal', value: src.name }));
  src.query && dst.push(makeProperty('query', { type: 'Literal', value: src.query }));
  src.markup && dst.push(makeProperty('markup', { type: 'Literal', value: src.markup }));
  src.values && dst.push(makeProperty('values', compileValues(src.values, errors)));
  src.children && dst.push(makeProperty('children', compileScopes(src.children, errors)));
  return {
    type: 'ObjectExpression',
    properties: dst
  } as es.ObjectExpression;
}

function compileScopes(scopes: ScopeProps[], errors: PageError[]) {
  const dst: es.ObjectExpression[] = [];
  scopes.forEach(scope => {
    dst.push(compileScope(scope, errors));
  });
  return {
    type: "ArrayExpression",
    elements: dst
  } as es.ArrayExpression;
}

function compileValues(values: ValueProps[], errors: PageError[]) {
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
 * @see ValueProps
 */
function compileValue(value: ValueProps, errors: PageError[]) {
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
