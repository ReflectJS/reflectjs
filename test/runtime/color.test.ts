import { assert } from "chai";
import { color2Components, components2Color, fullRgb, mixColors } from "../../src/runtime/color";

describe("test color", () => {

	it("should expand #rgb to #rrggbb", () => {
		assert.equal(fullRgb('#cde'), '#ccddee');
		assert.equal(fullRgb('#ccddee'), '#ccddee');
		assert.equal(fullRgb('xyz'), 'xyz');
	});

	it("should parse color string", () => {
		assert.deepEqual(color2Components('#cde'), {r:0xCC, g:0xDD, b:0xEE});
		assert.deepEqual(color2Components('#ccddee'), {r:0xCC, g:0xDD, b:0xEE});
		assert.deepEqual(color2Components('rgb(10,20,30)'), {r:10, g:20, b:30});
		assert.deepEqual(color2Components('rgb(10%,20%,30%)'), {r:25, g:51, b:76});
		assert.deepEqual(color2Components('rgba(10,20,30,.4)'), {r:10, g:20, b:30, a:.4});
		assert.deepEqual(color2Components('rgba(10%,20%,30%,.4)'), {r:25, g:51, b:76, a:.4});
	});

	it("should unparse color", () => {
		assert.equal(components2Color({r:0xC, g:0xDD, b:0xE0}), '#0cdde0');
		assert.equal(components2Color({r:10, g:20, b:30, a:.5}), 'rgba(10,20,30,0.5)');
	});

	it("should mix colors", () => {
		assert.equal(mixColors("#ff0080", "#002080", .5), '#801080');
	});

});
