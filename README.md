# Trillo

![version](https://img.shields.io/github/package-json/v/trillojs/trillo?style=flat-square)
![license](https://img.shields.io/github/license/trillojs/trillo?style=flat-square)
![codeql](https://img.shields.io/github/actions/workflow/status/trillojs/trillo/codeql.yml?branch=main&style=flat-square&label=codeql)
![build](https://img.shields.io/github/actions/workflow/status/trillojs/trillo/node.js.yml?branch=main&style=flat-square)
![tests](https://img.shields.io/endpoint?style=flat-square&url=https://gist.githubusercontent.com/fcapolini/ee36283cfd3eb89ecdd1e5d23910682f/raw/trillo-junit-tests.json)
![coverage](https://img.shields.io/endpoint?style=flat-square&url=https%3A%2F%2Fgist.githubusercontent.com%2Ffcapolini%2Fee36283cfd3eb89ecdd1e5d23910682f%2Fraw%2Ftrillo-cobertura-coverage.json)

## The HTML-oriented reactive web framework

Using a traditional reactive framework can be pretty involved.

Trillo is a groundbreaking alternative which strives for simplicity:

1. it turns HTML itself into a [reactive language](https://trillojs.dev/docs/concepts/reactivity)
2. it generates fully [indexable pages](https://trillojs.dev/docs/concepts/indexability)
3. it lets you create your own [custom tags](https://trillojs.dev/docs/concepts/reusability).
4. it makes it easy to create your own [component libraries](https://trillojs.dev/docs/concepts/kits).

It's implemented as a customizable [Express](https://expressjs.com/) server for [Node.js](https://nodejs.org/). It augments HTML with `:`-prefixed [attributes](https://trillojs.dev/docs/reference/language#1-logic-values-), `[[...]]` [expressions](https://trillojs.dev/docs/reference/language#2-reactive-expressions-), and `<:...>` [directives](https://trillojs.dev/docs/reference/preprocessor), and it's easy to pick up.

Page-specific JavaScript code for both the client and the server is  compiled on the fly as needed &mdash; you only have to focus on page logic and the server takes care of the rest, no matter what IDE or code editor you're using.

Trillo removes all the boilerplate associated with JS-oriented reactive web frameworks like [Angular](https://angular.io/), [React](https://react.dev/) and [Vue.js](https://vuejs.org/), while still encouraging good practices and code reuse. You'll be surprised at how effective it can be.

> Trillo is under active development. We plan to reach v.1.0 later in 2023.

## Hello World

1. install the package and create a dir for the example:

```sh
npm i -g trillo
mkdir myapp
trillo serve myapp
# ... START http://localhost:3000
```

2. add `myapp/index.html`

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

3. navigate to http://localhost:3000 to see the seconds counter live.

> If you look at the page source received by the browser you'll notice it contains the text "Seconds: 0". This shows that page logic is executed once in the server in order to deliver content-ready pages, and then transferred to the client to support local updates and user interaction: Trillo supports [isomorphism](https://en.wikipedia.org/wiki/Isomorphic_JavaScript) out of the box.

## More Info

* [Homepage](https://trillojs.dev/)
* [Quick Start](https://trillojs.dev/docs/quick-start) &mdash; quickly check it out
* [Overview](https://trillojs.dev/docs/concepts/overview) &mdash; get the gist of Trillo
* [Reference](https://trillojs.dev/docs/reference/cli) &mdash; find all the details
