import { generate } from "escodegen";
import { parseScript } from "esprima";
import * as es from "estree";
import { HtmlDocument } from "../preprocessor/htmldom";
import { PageProps } from "../runtime/page";
import { ScopeProps } from "../runtime/scope";
import { ValueProps } from "../runtime/value";
import { makeValueFunction } from "./expr-compiler";
import { isDynamic, preprocess } from "./expr-preprocessor";
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

function compileValues(values: { [key: string]: ValueProps }, errors: PageError[]) {
  const dst: es.Property[] = [];
  Reflect.ownKeys(values).forEach(key => {
    const props: ValueProps = values[key as string];
    dst.push(makeProperty(key as string, compileValue(props, errors)));
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
  if (isDynamic(value.val)) {
    const refs = new Set<string>();
    const fn = compileExpr(value.val, refs, errors);
    fn && (dst.push(makeProperty('fn', fn)));
    if (refs.size > 0) {
      const ee: es.Literal[] = [];
      refs.forEach(ref => ee.push({ type: "Literal", value: ref }));
      dst.push(makeProperty("refs", { type: "ArrayExpression", elements: ee }));
    }
    value.val = null;
  }
  dst.push(makeProperty("val", { type: "Literal", value: value.val }));
  return {
    type: 'ObjectExpression',
    properties: dst
  } as es.ObjectExpression;
}

//TODO: source position
function compileExpr(
  src: string, refs: Set<string>, errors: PageError[]
): es.FunctionExpression | undefined {
  const expr = preprocess(src);
  let ast, ret = undefined;
  try {
    ast = parseScript(expr.src, { loc: true });
    ret = makeValueFunction(null, ast, refs);
  } catch (error: any) {
    console.log(error); //TODO: add to errors[]
  }
  return ret;
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
