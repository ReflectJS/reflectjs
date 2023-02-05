# Reactive HTML

You can add logic values to any tag and use expressions anywhere in text and attributes to reflect results in the page.

Values are specified with attribute prefixed with `:`, expressions are fragments of JavaScript code surrounded with `[[` and `]]`.

```html
<div :count="[[0]]"
     :did-init="[[
       setInterval(() => count++, 1000)
     ]]">
  Seconds: [[count]]
</div>
```

This example displays the number of seconds since it started. The `div` has a value `count` initialized to zero, and implements a delegate method, `did-init`, which executed code after it's been initialized.

`did-init` sets up a timer that once per second increments `count`.

Inside `div`'s text there is an expression which reflects the current value of `count` in the page. Because Reflect.js HTML is a reactive language, expressions are automatically updated and reflected as needed.

## Logic values

TBD

## Expressions

TBD
