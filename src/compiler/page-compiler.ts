import { generate } from "escodegen";
import { parseScript } from "esprima";
import * as es from "estree";
import { HtmlDocument } from "../preprocessor/htmldom";
import { HANDLER_VALUE_PREFIX, PageProps } from "../runtime/page";
import { ScopeProps } from "../runtime/scope";
import { ValueProps } from "../runtime/value";
import { checkFunctionKind, makeFunction, makeValueFunction } from "./expr-compiler";
import { isDynamic, preprocess } from "./expr-preprocessor";
import { loadPage } from "./page-preprocessor";

export interface PageError {
  type: 'error' | 'warning';
  msg: string;
  //TODO: pos
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
    if (typeof key === 'string') {
      const props: ValueProps = values[key];
      key = key.replace('-', '_');  
      dst.push(makeProperty(key, compileValue(key, props, errors)));
    }
  });
  return {
    type: 'ObjectExpression',
    properties: dst
  } as es.ObjectExpression;
}

/**
 * @see ValueProps
 */
function compileValue(key: string, value: ValueProps, errors: PageError[]) {
  const dst: es.Property[] = [];
  if (isDynamic(value.val)) {
    const refs = new Set<string>();
    const { fn, kind } = compileExpr(key, value.val, refs, errors);
    if (fn && kind === 'fun') {
      dst.push(makeProperty('val', fn));
      dst.push(makeProperty('passive', { type: "Literal", value: true }));
    } else if (fn && kind === 'exp' ) {
      dst.push(makeProperty('fn', fn));
      dst.push(makeProperty("val", { type: "Literal", value: null }));
      if (key.startsWith(HANDLER_VALUE_PREFIX)) {
        refs.clear();
        refs.add(key.substring(HANDLER_VALUE_PREFIX.length));
      }
      if (refs.size > 0) {
        const ee: es.Literal[] = [];
        refs.forEach(ref => ee.push({ type: "Literal", value: ref }));
        dst.push(makeProperty("refs", { type: "ArrayExpression", elements: ee }));
      }
    }
    value.val = null;
  } else {
    dst.push(makeProperty("val", { type: "Literal", value: value.val }));
  }
  if (value.domKey) {
    dst.push(makeProperty("domKey", { type: "Literal", value: value.domKey }));
  }
  return {
    type: 'ObjectExpression',
    properties: dst
  } as es.ObjectExpression;
}

//TODO: source position
function compileExpr(
  key: string, src: string, refs: Set<string>, errors: PageError[]
): { fn?: es.FunctionExpression | es.ArrowFunctionExpression, kind?: 'exp' | 'fun' } {
  const expr = preprocess(src);
  let ast, fn = undefined, kind: 'exp' | 'fun' | undefined = undefined;
  try {
    ast = parseScript(expr.src, { loc: true });
    const functionKind = checkFunctionKind(ast);
    if (functionKind) {
      fn = makeFunction(ast, refs);
      kind = 'fun';
    } else {
      fn = makeValueFunction(key, ast, refs);
      kind = 'exp';
    }
  } catch (error: any) {
    console.log(error); //TODO: add to errors[]
  }
  return { fn, kind };
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
