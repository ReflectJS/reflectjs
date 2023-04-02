# Reflect.js

[![CodeQL](https://github.com/fcapolini/reflectjs/actions/workflows/codeql.yml/badge.svg)](https://github.com/fcapolini/reflectjs/actions/workflows/codeql.yml)
[![Node.js CI](https://github.com/fcapolini/reflectjs/actions/workflows/node.js.yml/badge.svg)](https://github.com/fcapolini/reflectjs/actions/workflows/node.js.yml)
![Coverage](res/coverage-badge-230402.svg)

Reflect.js turns *HTML itself* into a [reactive language](#reactivity) for creating modern web sites and web apps, still [fully indexable](#indexability) out of the box, that can easily be based on [reusable components](#reusability).

---

## Reactivity {#reactivity}

Reflect.js is an [Express](https://expressjs.com/) application for [Node.js](https://nodejs.org/) which processes and serves web pages, giving them the ability to execute unified client/server reactive logic.

```bash
npm install -g reflectjs
# now you can start a local server with the "reflectjs" command
cd <document-root-dir>
reflectjs
# 2023-03-31 11:46:18: START http://localhost:3001
```

index.html:

```html
<html>
  <body :count="[[0]]"
        :did-init="[[
            setInterval(() => count++, 1000)
        ]]">
    seconds: [[count]]
  </body>
</html>
```

Reflect.js adds page-specific code that starts executing in the server and continues in the client.

By opening [http://localhost:3001/](http://localhost:3001/) you'll get a live seconds counter, and in the page source you can see it was initially output with "seconds: 0" and then regularly updated in the client.

Requests with the `__noclient` parameter can be used to see what the page looks like to clients with no support for JavaScript, like search engine crawlers, so opening [http://localhost:3001/?__noclient](http://localhost:3001/?__noclient) you'll get a static page saying "seconds: 0".

---

## Indexability {#indexability}

Reflect.js lets you easily create web projects that behave as both classic websites (ensuring page indexability) and as dynamic webapps (providing a modern user experience).

app/index.html:

```html
<html :URLPATH="/">
  <body>
    <div>
      <a href="index">[home]</a> | <a href="products">[products]</a>
    </div>

    <:on-off :on="[[head.router.name === 'index']]">
      <div>Home</div>
    </:on-off>

    <:on-off :on="[[head.router.name === 'products']]">
      <div>Products</div>
    </:on-off>
  </body>
</html>
```

This page is delivered for all paths inside its own directory, thanks to the `:URLPATH` directive. It can know what name it was requested with using the built-in `head.router` component.

Based on that, it can decide what actual content is displayed using the `<:on-off>` built-in component.

[http://localhost:3001/app](http://localhost:3001/app):

```
[home] | [products]
Home
```

The same logic runs in both the server and the client. This means when users click a link, navigation is handled in browser and page content is switched with no need for additional requests to the server.

At the same time, both links can be requested directly to the server to get the page with the relevant content, just as if they were two physical pages.

[http://localhost:3001/app/products](http://localhost:3001/app/products):

```
[home] | [products]
Products
```

The `<:on-off>` built-in component is implemented using a [`<template>`](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/template) tag, meaning its content is effectively removed from the DOM when `:on` is false.

The `head.router` built-in component is implemented using the [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) in browsers which support it. Those that don't (including web search engines) will simply navigate the app making actual HTTP requests.

👉 In a real app you'll want to keep different page contents in different `.htm` page fragment files, and you'll include them in the main file using the `<:include>` directive

---

## Reusability {#reusability}

In HTML pages there's always a number of blocks replicated with minimal changes:

```html
<div class="products">
  <div class="product">
    <span>Gadget<span>
    <span class="price">€1</span>
  </div>
  <div class="product">
    <span>Widget<span>
    <span class="price">€2</span>
  </div>
</div>
```

Using the `<:define>` directive you can declare your own custom tags:

```html
<:define tag="app-product" class="product">
  <span>[[name]]<span>
  <span class="price">€[[price]]</span>
</:define>

<div class="products">
  <app-product :name="Gadget" :price="1"/>
  <app-product :name="Widget" :price="2"/>
</div>
```

We now have a much simpler markup that clearly specifies what it represent (an application product) and what's specific to each instance (name and price), greatly improving readability and mainainability.

Custom tag definitions are usually collected in page fragment files, with a `.htm` extensions so the server won't deliver them, and page fragments are `<:import>`-ed in pages when needed:

```html
<html>
  <head>
    <:import src="lib.htm"/>
  </head>
  <body>
    <app-product :name="Gadget" :price="1"/>
    <app-product :name="Widget" :price="2"/>
  <body>
</html>
```

Because it's imported inside the `<head>` tag, `lib.htm` can further declutter page code by referencing any needed CSS file and declaring the usual meta tags itself:

```html
<lib>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link href="index.css" rel="stylesheet">

  <:define tag="app-product" class="product">
    <span>[[name]]<span>
    <span class="price">€[[price]]</span>
  </:define>
</lib>
```

👉 Page fragments must have an arbitrary root tag, `<lib>` here.
