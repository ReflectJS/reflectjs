import { assert } from "chai";
import { generate } from "escodegen";
import { parseScript } from "esprima";
import { checkFunctionType, makeFunction, makeValueFunction } from "../../src/compiler/expr-compiler";
import { preprocess } from "../../src/compiler/expr-preprocessor";
import { normalizeSpace } from "../../src/preprocessor/util";

describe("expr-compiler", () => {

  it(`empty script`, () => {
    const ids = new Set<string>();
    const pre = parseScript(``);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.equal(ids.size, 0);
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
    }`));
  });

  it(`empty statement`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`;`);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.equal(ids.size, 0);
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      ;
    }`));
  });

  it(`value reference`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`x + 1`);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isTrue(ids.has('x'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      return this.x + 1;
    }`));
  });

  it(`local var reference 1`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`var x; x + 1`);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      var x; return x + 1;
    }`));
  });

  it(`local var reference 2`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`var x = 0; x + 1`);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      var x = 0; return x + 1;
    }`));
  });

  it(`local var reference 3`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`var x = 0, y; x + y + 1`);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    assert.isFalse(ids.has('y'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      var x = 0, y; return x + y + 1;
    }`));
  });

  it(`local var reference 4`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`
      var x = 0, y = 1;
      { var z; }
      x + y + z + 1;
    `);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    assert.isFalse(ids.has('y'));
    assert.isFalse(ids.has('z'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      var x = 0, y = 1; { var z; } return x + y + z + 1;
    }`));
  });

  it(`local let/const reference 1`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`let x; x + 1`);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x; return x + 1;
    }`));
  });

  it(`local let/const reference 2`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`let x = 0; x + 1`);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 0; return x + 1;
    }`));
  });

  it(`local let/const reference 3`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`let x = 0, y; x + y + 1`);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    assert.isFalse(ids.has('y'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 0, y; return x + y + 1;
    }`));
  });

  it(`local let/const reference 4`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`
      let x = 0, y = 1;
      { let z; }
      x + y + z + 1;
    `);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    assert.isFalse(ids.has('y'));
    assert.isTrue(ids.has('z'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 0, y = 1; { let z; } return x + y + this.z + 1;
    }`));
  });

  it(`local let/const reference 5`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`
    let x = 0, y = 1;
    if (true) { let z = 1; }
    x + y + z + 1;
  `);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    assert.isFalse(ids.has('y'));
    assert.isTrue(ids.has('z'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 0, y = 1; if (true) { let z = 1; } return x + y + this.z + 1;
    }`));
  });

  it(`local let/const reference 6`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`
      let x = 0, y = 1;
      for (let z = 0; z < 10; z++) console.log(z);
      x + y + z + 1;
    `);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    assert.isFalse(ids.has('y'));
    assert.isTrue(ids.has('z'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 0, y = 1;
      for (let z = 0; z < 10; z++) this.console.log(z);
      return x + y + this.z + 1;
    }`));
  });

  it(`local function 1`, () => {
    const ids = new Set<string>();
    const pre = parseScript(`
      let x = 2;
      function f1(a1) {
        return a1 + x + y;
      }
      f1(1) + f2() + x + y;
    `);
    assert.notExists(checkFunctionType(pre));
    const ast = makeValueFunction(null, pre, ids);
    assert.isFalse(ids.has('x'));
    assert.isFalse(ids.has('f1'));
    assert.isFalse(ids.has('a1'));
    assert.isTrue(ids.has('y'));
    assert.isTrue(ids.has('f2'));
    const src = generate(ast);
    assert.equal(normalizeSpace(src), normalizeSpace(`function () {
      let x = 2;
      function f1(a1) {
        return a1 + x + this.y;
      }
      return f1(1) + this.f2() + x + this.y;
    }`));
  });

  it(`function value 1`, async () => {
    const src1 = preprocess('[[function (ev) { console.log(x); ev.cancel(); }]]').src;
    const ast1 = parseScript(src1);
    assert.equal(checkFunctionType(ast1), 'FunctionExpression');
    const ast2 = makeFunction(ast1, new Set());
    const src2 = generate(ast2);
    assert.equal(normalizeSpace(src2), `function (ev) { this.console.log(this.x); ev.cancel(); }`);
  });

  it(`function value 2`, async () => {
    const src1 = preprocess('[[(ev) => ev.cancel()]]').src;
    const ast1 = parseScript(src1);
    assert.equal(checkFunctionType(ast1), 'ArrowFunctionExpression');
    const ast2 = makeFunction(ast1, new Set());
    const src2 = generate(ast2);
    assert.equal(normalizeSpace(src2), `ev => ev.cancel()`);
  });

});
