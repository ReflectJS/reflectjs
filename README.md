# Trillo

[![CodeQL](https://github.com/trillojs/trillo/actions/workflows/codeql.yml/badge.svg)](https://github.com/trillojs/trillo/actions/workflows/codeql.yml)
[![Node.js CI](https://github.com/trillojs/trillo/actions/workflows/node.js.yml/badge.svg)](https://github.com/trillojs/trillo/actions/workflows/node.js.yml)
![Coverage](https://github.com/trillojs/trillo/raw/main/res/coverage-badge-230912.svg)

![version](https://img.shields.io/github/package-json/v/trillojs/trillo?style=flat-square)
![license](https://img.shields.io/github/license/trillojs/trillo?style=flat-square)
![codeql](https://img.shields.io/github/actions/workflow/status/trillojs/trillo/codeql.yml?branch=main&style=flat-square&label=codeql)
![build](https://img.shields.io/github/actions/workflow/status/trillojs/trillo/node.js.yml?branch=main&style=flat-square)
![tests](https://img.shields.io/endpoint?style=flat-square&url=https://gist.githubusercontent.com/trillojs/ee36283cfd3eb89ecdd1e5d23910682f/raw/trillo-junit-tests.json)
![coverage](https://img.shields.io/endpoint?style=flat-square&url=https%3A%2F%2Fgist.githubusercontent.com%2Ftrillojs%2Fee36283cfd3eb89ecdd1e5d23910682f%2Fraw%2Ftrillo-cobertura-coverage.json)

**The HTML-oriented reactive framework**

---

Using a reactive framework in modern web development can be pretty involved &mdash;&nbsp;but&nbsp;it&nbsp;doesn't&nbsp;have&nbsp;to&nbsp;be.

Trillo is a groundbreaking alternative which strives for simplicity:

1. it turns HTML itself into a [reactive language](https://trillojs.gitbook.io/docs/topics/reactivity)
2. it generates fully [indexable pages](https://trillojs.gitbook.io/docs/topics/indexability) out of the box
3. it makes it easy to create your own [reusable components](https://trillojs.gitbook.io/docs/topics/reusability).

It's implemented as a customizable [Express](https://expressjs.com/) server for [Node.js](https://nodejs.org/). It augments HTML with `:`-prefixed [attributes](https://trillojs.gitbook.io/docs/reference/language#values), `[[...]]` [expressions](https://trillojs.gitbook.io/docs/reference/language#expressions), and `<:...>` [directives](https://trillojs.gitbook.io/docs/reference/preprocessor), and it's easy to pick up.

Page-specific JavaScript code for both the client and the server is  compiled on the fly as needed &mdash; you only have to focus on page logic and the server takes care of the rest.

Trillo removes all the boilerplate code associated with JS-oriented reactive web frameworks like [React](https://react.dev/) and [Vue.js](https://vuejs.org/), while still encouraging good practices and code reuse &mdash; you'll be surprised at how effective it can be.

> Trillo is still under development. We plan to reach v.1.0 later in 2023.

## Hello World

1. create a dir and install the package:

```sh
mkdir myapp && cd myapp
npm install trillo
npx trillo
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

> If you install globally with `npm install -g trillo` you can just launch the server from any directory with the `trillo` command.

## Use in a project

1. create the project

```sh
mkdir myproject cd myproject
npm init -y
npm install trillo
mkdir docroot
```

2. add an entry point

```js
// index.js
const trillo = require('trillo');
const path = require('path');

new trillo.Server({
  port: 3002,
  rootPath: path.join(__dirname, 'docroot'),
});
```

in TypeScript we can use imports instead

```ts
// index.ts
import { Server } from 'trillo';
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

> When using Trillo in a project you can configure it and add your own services and middleware. All options are documented in the [Server Reference](https://trillo.org/docs/reference/server).

## Next steps

* [Overview](https://trillojs.gitbook.io/docs/overview) &mdash; get the gist of Trillo
* [Tutorials](https://trillojs.gitbook.io/docs/tutorials) &mdash; get a taste of Trillo development
* [Reference](https://trillojs.gitbook.io/docs/reference) &mdash; find all the details
