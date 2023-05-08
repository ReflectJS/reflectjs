# Reflect.js

[![CodeQL](https://github.com/reflectjs/reflectjs-core/actions/workflows/codeql.yml/badge.svg)](https://github.com/reflectjs/reflectjs-core/actions/workflows/codeql.yml)
[![Node.js CI](https://github.com/reflectjs/reflectjs-core/actions/workflows/node.js.yml/badge.svg)](https://github.com/reflectjs/reflectjs-core/actions/workflows/node.js.yml)
![Coverage](https://github.com/reflectjs/reflectjs-core/raw/main/res/coverage-badge-230423.svg)

**The HTML-oriented reactive framework**

---

Using a reactive framework in modern web development can be pretty involved &mdash;&nbsp;but&nbsp;it&nbsp;doesn't&nbsp;have&nbsp;to&nbsp;be.

Reflect.js is a groundbreaking alternative which strives for simplicity:

1. it turns HTML itself into a [reactive language](https://reflectjs.org/docs/introduction#reactivity)
2. it generates fully [indexable pages](https://reflectjs.org/docs/introduction#indexability) out of the box
3. it makes it easy to create your own [reusable components](https://reflectjs.org/docs/introduction#reusability).

It's implemented as a customizable [Express](https://expressjs.com/) server for [Node.js](https://nodejs.org/). It augments HTML with `:`-prefixed [attributes](https://reflectjs.org/docs/reference/language#values), `[[...]]` [expressions](https://reflectjs.org/docs/reference/language#expressions), and `<:...>` [directives](https://reflectjs.org/docs/reference/language#directives), so it's pretty easy to pick up.

Page-specific JavaScript code for both the client and the server is  compiled on the fly as needed &mdash; you only have to focus on page logic and the server takes care of the rest.

Reflect.js removes all the boilerplate code associated with JS-oriented reactive web frameworks like [React](https://react.dev/) and [Vue.js](https://vuejs.org/), while still encouraging good practices and code reuse &mdash; you'll be surprised at how effective it can be.

> Reflect.js is still under development. We plan to reach v.1.0 later in 2023.

## Hello World

1. create a dir and install the package:

```sh
mkdir myapp && cd myapp
npm install reflectjs-core
npx reflectjs
# ... START http://localhost:3001
```

2. add `index.html`

```html
<html>
  <body :count="[[0]]"
        :did-init="[[
          setInterval(() => count++, 1000);
        ]]">
    Seconds: [[count]]
  </body>
</html>
```

3. navigate to http://localhost:3001 to see the seconds counter live.

> If you install globally with `npm install -g reflectjs-core` you can just launch the server from any directory with the `reflectjs` command.

## Use in a project

1. create the project

```sh
mkdir myproject cd myproject
npm init -y
npm install reflectjs-core
mkdir docroot
```

2. add an entry point

```js
// index.js
const reflectjs = require('reflectjs-core');
const path = require('path');

new reflectjs.Server({
  port: 3002,
  rootPath: path.join(__dirname, 'docroot'),
});
```

in TypeScript we can use imports instead

```ts
// index.ts
import { Server } from 'reflectjs-core';
import path from 'path';

new Server({
  port: 3002,
  rootPath: path.join(__dirname, 'docroot'),
});
```

3. add `docroot/index.html`

```html
<html>
  <body :count="[[0]]"
        :did-init="[[
          setInterval(() => count++, 1000);
        ]]">
    Seconds: [[count]]
  </body>
</html>
```

4. run the project:

```sh
node index.js
# ... START http://localhost:3002
```

5. navigate to http://localhost:3002 to see the seconds counter live.

> When using Reflect.js in a project you can configure it and add your own services and middleware. All options are documented in the [Server Reference](https://reflectjs.org/docs/reference/server).

## Next steps

* [Introduction](https://reflectjs.org/docs/introduction) &mdash; get the gist of Reflect.js
* [Tutorial](https://reflectjs.org/docs/tutorial) &mdash; get a taste of Reflect.js development
* [Reference](https://reflectjs.org/docs/reference/language#values) &mdash; find all the details
