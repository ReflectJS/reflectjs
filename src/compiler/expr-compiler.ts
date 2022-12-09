import estraverse from "estraverse";
import * as es from "estree";
import { OUTER_PROPERTY } from "../runtime/page";

export function checkFunctionKind(script: es.Program): string | null {
  if (script.body.length === 1 && script.body[0].type === 'ExpressionStatement') {
    const type = script.body[0].expression.type;
    if (type === 'FunctionExpression' || type === 'ArrowFunctionExpression') {
      return type;
    }
  }
  return null;
}

// use only if checkFunctionKind() !== null
export function makeFunction(
  script: es.Program, references: Set<string>
): es.FunctionExpression {
  const src = (script.body[0] as any).expression as
    es.FunctionExpression | es.ArrowFunctionExpression;
  
  const locals = new Set<string>();
  src.params.forEach(pattern => {
    if (pattern.type === 'Identifier') {
      locals.add(pattern.name);
    }
    //TODO: other possible function parameter types
  });

  let body: es.Statement[];
  if (src.body.type === 'BlockStatement') {
    body = src.body.body;
  } else {
    body = [{
      type: 'ExpressionStatement',
      expression: src.body
    }];
  }

  const noImplicitReturn = (
    src.type !== 'ArrowFunctionExpression' ||
    src.body.type === 'BlockStatement'
  );
  
  return {
    type: 'FunctionExpression',
    params: src.params,
    body: makeFunctionBody(null, body, references, locals, noImplicitReturn)
  }
}

// use only if checkFunctionKind() === null
export function makeValueFunction(
  key: string | null, script: es.Program, references: Set<string>
): es.FunctionExpression {
  return {
    type: 'FunctionExpression',
    params: [],
    body: makeFunctionBody(key, script.body as es.Statement[], references)
  }
}

function makeFunctionBody(
  key: string | null, statements: es.Statement[], references: Set<string>,
  locals?: Set<string>, noImplicitReturn?: boolean
): es.BlockStatement {
  const len = statements.length;
  for (let i = 0; i < len; i++) {
    const node: any = statements[i];
    if (node.type === 'ExpressionStatement' && node.directive) {
      delete node.directive;
    }
    if (i === (len - 1) && node.type === 'ExpressionStatement' && !noImplicitReturn) {
      statements[i] = {
        type: 'ReturnStatement',
        argument: node.expression
      }
    }
  }
  const ret: es.BlockStatement = {
    type: 'BlockStatement',
    body: statements
  }
  qualifyIdentifiers(key, ret, references, locals);
  return ret;
}

function qualifyIdentifiers(
  key: string | null, body: es.Node, references: Set<string>, locals?: Set<string>
) {
  const scopes: Array<{ isFunction: boolean, ids: Set<string> }> = [];

  function enterScope(isFunction: boolean, locals?: Set<string>) {
    scopes.push({ isFunction: isFunction, ids: locals ?? new Set() });
  }

  function leaveScope() {
    scopes.pop();
  }

  function addLocalId(id: string, isVar: boolean) {
    let scope;
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (!isVar || scopes[i].isFunction) {
        scope = scopes[i];
        break;
      }
    }
    scope?.ids.add(id);
  }

  function isLocalId(id: string): boolean {
    for (let i = scopes.length - 1; i >= 0; i--) {
      if (scopes[i].ids.has(id)) {
        return true;
      }
    }
    return false;
  }

  // https://github.com/estools/estraverse
  const stack: es.Node[] = [];
  const ret = estraverse.replace(body, {
    enter: (node, parent) => {
      // console.log(`${'  '.repeat(stack.length)}${node.type} {`);
      const parentParent = (stack.length > 1 ? stack[stack.length - 2] : null);
      stack.push(node);

      if (node.type === 'Identifier') {
        if (
          (parent?.type === 'MemberExpression' && node === parent.property) ||
          isLocalId(node.name)
        ) {
          return;
        }
        if (parent?.type === 'VariableDeclarator') {
          let isVar = true;
          if (parentParent?.type === 'VariableDeclaration') {
            isVar = (parentParent.kind === 'var');
          }
          addLocalId(node.name, isVar);
          return;
        }
        if (parent?.type === 'Property' && parent.key === node) {
          return;
        }
        //TODO: exclude function parameters?
        references.add(node.name);
        let obj: es.Node;
        if (!key || node.name !== key) {
          obj = { type: 'ThisExpression' };
        } else {
          obj = {
            type: 'MemberExpression',
            computed: false,
            optional: false,
            object: { type: 'ThisExpression' },
            property: { type: 'Identifier', name: OUTER_PROPERTY }
          };
        }
        return {
          type: 'MemberExpression',
          computed: false,
          optional: false,
          object: obj,
          property: node
        }
      } else if (node.type === 'BlockStatement') {
        if (stack.length == 1) {
          enterScope(true, locals);
        } else {
          enterScope(false);
        }
      } else if (
        node.type === 'WhileStatement' ||
        node.type === 'DoWhileStatement' ||
        node.type === 'ForStatement' ||
        node.type === 'ForInStatement' ||
        node.type === 'ForOfStatement'
      ) {
        enterScope(false);
      } else if (
        node.type === 'FunctionDeclaration' ||
        node.type === 'FunctionExpression' ||
        node.type === 'ArrowFunctionExpression'
      ) {
        if (node.type !== 'ArrowFunctionExpression') {
          if (node.id && node.id.type === 'Identifier') {
            addLocalId(node.id.name, true);
          }
        }
        enterScope(true);
        node.params.forEach(p => {
          if (p.type === 'Identifier') {
            addLocalId(p.name, true);
          }
          //TODO: other possible function parameter types
        });
      }
    },

    leave: (node, parent) => {
      stack.pop();
      // console.log(`${'  '.repeat(stack.length)}}`);

      if (node.type === 'BlockStatement') {
        leaveScope();
      } else if (
        node.type === 'WhileStatement' ||
        node.type === 'DoWhileStatement' ||
        node.type === 'ForStatement' ||
        node.type === 'ForInStatement' ||
        node.type === 'ForOfStatement'
      ) {
        leaveScope();
      } else if (
        node.type === 'FunctionDeclaration'
        //TODO: FunctionExpression | ArrowFunctionExpression
      ) {
        leaveScope();
      }
    }
  });

  return ret;
}
