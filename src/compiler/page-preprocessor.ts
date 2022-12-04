import { ELEMENT_NODE, TEXT_NODE } from "../preprocessor/dom";
import { HtmlDocument, HtmlElement, HtmlText } from "../preprocessor/htmldom";
import * as page from "../runtime/page";
import * as scope from "../runtime/scope";
import * as value from "../runtime/value";
import { isDynamic } from "./expr-preprocessor";
import { PageError } from "./page-compiler";

export function loadPage(doc: HtmlDocument) {
  const root = doc.firstElementChild as HtmlElement;
  let count = 0;

  function needsScope(e: HtmlElement) {
    const tag = e.tagName;
    if (tag === 'HTML' || tag === 'HEAD' || tag === 'BODY') {
      return true;
    }
    for (const key in e.attributes.keys) {
      if (key.startsWith(page.LOGIC_ATTR_PREFIX)) {
        return true;
      }
    }
    return false;
  }

  function markScopes(e: HtmlElement) {
    if (needsScope(e)) {
      e.setAttribute(page.DOM_ID_ATTR, `${count++}`);
    }
    e.childNodes.forEach(n => {
      n.nodeType === ELEMENT_NODE && markScopes(n as HtmlElement);
    });
  }

  markScopes(root)
  const errors: PageError[] = [];
  const props = {
    root: loadScope(root, errors)
  };
  return { props, errors };
}

function loadScope(e: HtmlElement, errors: PageError[]): scope.ScopeProps {
  const ret: scope.ScopeProps = {
    id: parseInt(e.getAttribute(page.DOM_ID_ATTR) as string),
    values: [],
    children: []
  };
  switch (e.tagName) {
    case 'HTML':
      ret.name = page.ROOT_SCOPE_NAME;
      ret.query = 'html';
      break;
    case 'HEAD':
      ret.name = page.HEAD_SCOPE_NAME;
      ret.query = 'head';
      break;
    case 'BODY':
      ret.name = page.BODY_SCOPE_NAME;
      ret.query = 'body';
      break;
    default:
      ret.query = `[${page.DOM_ID_ATTR}="${ret.id}"]`;
  }
  e.getAttribute(page.AKA_ATTR) && (ret.name = e.getAttribute(page.AKA_ATTR));
  loadValues(e, ret.values as value.ValueProps[], errors);
  function scan(p: HtmlElement) {
    p.childNodes.forEach(n => {
      if (n.nodeType === ELEMENT_NODE) {
        if ((n as HtmlElement).getAttribute(page.DOM_ID_ATTR) != null) {
          ret.children?.push(loadScope((n as HtmlElement), errors));
        }
      } else if (n.nodeType === TEXT_NODE) {
        if (isDynamic((n as HtmlText).nodeValue)) {
          ret.values?.push(loadText(n as HtmlText, errors));
        }
      }
    });
  }
  scan(e);
  (ret.values && ret.values.length < 1) && (delete ret.values);
  (ret.children && ret.children.length < 1) && (delete ret.children);
  return ret;
}

function loadValues(e: HtmlElement, ret: value.ValueProps[], errors: PageError[]) {
  //TODO
}

function loadText(t: HtmlText, errors: PageError[]): value.ValueProps {
  //TODO
  return { key: '', val: '' };
}
