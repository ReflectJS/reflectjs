import { assert } from "chai";
import { preprocess } from "../../src/compiler/expr-preprocessor";
import { NOTNULL_FN } from "../../src/runtime/page";

describe("expr-preprocessor", () => {

  it("should prepare empty expressions", () => {
    assert.equal(preprocess('').src, "''");
    assert.equal(preprocess('[[]]').src, "");
    assert.equal(preprocess('[[ ]]').src, "");
  });

  it("should prepare quotes", () => {
    assert.equal(preprocess('x').src, "'x'");
    assert.equal(preprocess('"').src, "'\\\"'");
    assert.equal(preprocess("'").src, "'\\\''");
  });

  it("should prepare complex expressions", () => {
    assert.equal(preprocess(" [[1 + 2]]").src, `' '+${NOTNULL_FN}(1 + 2)`);
    assert.equal(preprocess("[[1 + 2]] ").src, `${NOTNULL_FN}(1 + 2)+' '`);
    assert.equal(preprocess(" [[1 + 2]] ").src, `' '+${NOTNULL_FN}(1 + 2)+' '`);
    assert.equal(preprocess('[[f("\"hello\"")]]').src, '(f("\"hello\""))');
    assert.equal(preprocess("[[f('\"hello\"')]]").src, '(f(\'"hello"\'))');
    assert.equal(preprocess("sum: [[1 + 2]]").src, `'sum: '+${NOTNULL_FN}(1 + 2)`);
  });

  it("should prepare function expressions", () => {
    assert.equal(preprocess("[[function() {return 1}]]").src, '(function() {return 1})');
    assert.equal(preprocess("[[function() {return 1\n" + "}]]").src, '(function() {return 1\n' + '})');
    assert.equal(preprocess(`[[if (true) {
      trace('ok');
    } else {
      trace('ko');
    }]]`).src, `(if (true) {
      trace('ok');
    } else {
      trace('ko');
    })`);
    assert.equal(preprocess("[[function(x) {return x * 2}]]").src, '(function(x) {return x * 2})');
    assert.equal(preprocess("[[function\n(x) {return x * 2}]]").src, '(function\n(x) {return x * 2})');
    assert.equal(preprocess("[[(x) => {return x * 2}]]").src, '((x) => {return x * 2})');
    assert.equal(preprocess("[[\n(x) => {return x * 2}]]").src, '(\n(x) => {return x * 2})');
    assert.equal(preprocess("[[(x) =>\n{return x * 2}]]").src, '((x) =>\n{return x * 2})');
    assert.equal(preprocess("[[x => {return x * 2}]]").src, '(x => {return x * 2})');
    assert.equal(preprocess("[[\nx => {return x * 2}]]").src, '(\nx => {return x * 2})');
    assert.equal(preprocess("[[x =>\n{return x * 2}]]").src, '(x =>\n{return x * 2})');
    assert.equal(preprocess(`[[function(x, y) {
      return x * y;
    }]]`).src, `(function(x, y) {
      return x * y;
    })`);
  });

  it("should prepare data expressions", () => {
    assert.equal(
      preprocess(`[[ [{list:[1,2]}, {list:["a","b","c"]}] ]]`).src,
      '( [{list:[1,2]}, {list:["a","b","c"]}] )'
    );
    assert.equal(preprocess(`[[ [
        {list:[1,2]},
        {list:["a","b","c"]}
      ] ]]`).src,
      `( [
        {list:[1,2]},
        {list:["a","b","c"]}
      ] )`
    );
    assert.equal(preprocess(`[[[
        {list:[1,2]},
        {list:["a","b","c"]}
      ]]]`).src,
      `([
        {list:[1,2]},
        {list:["a","b","c"]}
      ])`
    );
  });

  it("should prepare complex class expression", () => {
    assert.equal(
      preprocess(`btn btn-[[outline ? 'outline-' : '']][[type]][[nowrap ? ' text-nowrap' : '']][[size ? ' btn-'+size : '']]`).src,
      `'btn btn-'+__nn(outline ? 'outline-' : '')+__nn(type)+__nn(nowrap ? ' text-nowrap' : '')+__nn(size ? ' btn-'+size : '')`
    );
  });

});
