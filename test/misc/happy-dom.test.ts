import { assert } from "chai";
import { Window } from 'happy-dom';

describe('happy-dom', function () {

  it("should execute example", () => {
    const window = new Window();
    const document = window.document;
    document.body.innerHTML = '<div class="container"></div>';
    const container = document.querySelector('.container');
    const button = document.createElement('button');
    container.appendChild(button);
    assert.equal(
        document.body.innerHTML,
        `<div class="container"><button></button></div>`
    );
  });

});
