import { ELEMENT_NODE, TEXT_NODE } from "../preprocessor/dom";
import { HtmlAttribute, HtmlDocument, HtmlElement, HtmlText } from "../preprocessor/htmldom";
import * as page from "../runtime/page";
import { ScopeProps } from "../runtime/scope";
import { ValueProps } from "../runtime/value";
import { EXPR_MARKER1, EXPR_MARKER2, isDynamic } from "./expr-preprocessor";
import { PageError } from "./page-compiler";

export function loadPage(doc: HtmlDocument) {
  const root = doc.firstElementChild as HtmlElement;
  let count = 0;

  function needsScope(e: HtmlElement) {
    const tag = e.tagName;
    if (tag === 'HTML' || tag === 'HEAD' || tag === 'BODY') {
      return true;
    }
    for (const key of Array.from(e.attributes.keys())) {
      if (
        key.startsWith(page.LOGIC_ATTR_PREFIX) ||
        e.attributes.get(key)?.quote === '[' ||
        isDynamic(e.getAttribute(key))
      ) {
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

function loadScope(e: HtmlElement, errors: PageError[]): ScopeProps {
  const ret: ScopeProps = {
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
  loadValues(e, ret.values as ValueProps[], errors);

  const textValueProps: ValueProps[] = [];
  function scan(p: HtmlElement) {
    p.childNodes.forEach(n => {
      if (n.nodeType === ELEMENT_NODE) {
        if ((n as HtmlElement).getAttribute(page.DOM_ID_ATTR) != null) {
          ret.children?.push(loadScope((n as HtmlElement), errors));
        } else {
          scan(n as HtmlElement);
        }
      } else if (n.nodeType === TEXT_NODE) {
        if (isDynamic((n as HtmlText).nodeValue)) {
          loadTexts(n as HtmlText, textValueProps, errors);
        }
      }
    });
  }
  scan(e);
  ret.values?.push(...textValueProps);

  (ret.values && ret.values.length < 1) && (delete ret.values);
  (ret.children && ret.children.length < 1) && (delete ret.children);
  return ret;
}

function loadValues(e: HtmlElement, ret: ValueProps[], errors: PageError[]) {
  e.attributes.forEach((attr, key) => {
    if (key.startsWith(page.LOGIC_ATTR_PREFIX)) {
      loadValue(key.substring(page.LOGIC_ATTR_PREFIX.length), attr, ret, errors);
      e.removeAttribute(key);
    } else if (attr.quote === '[' || isDynamic(attr.value)) {
      loadValue(page.ATTR_VALUE_PREFIX + key, attr, ret, errors);
      e.removeAttribute(key);
    }
  });
}

function loadValue(
  key: string, attr: HtmlAttribute, ret: ValueProps[], errors: PageError[]
) {
  ret.push({
    key: key,
    val: attr.quote === '[' ? `[[${attr.value}]]` : attr.value
  });
}

function loadTexts(t: HtmlText, ret: ValueProps[], errors: PageError[]) {
  const d = t.ownerDocument as HtmlDocument;
  const p = t.parentElement as HtmlElement;
  const s = t.nodeValue;

  let i1a, i1b, i2a, i2b = 0, id;
  while ((i1a = s.indexOf(EXPR_MARKER1, i2a)) >= i2b) {
    id = ret.length;
    i1b = i1a + EXPR_MARKER1.length;
    if ((i2a = s.indexOf(EXPR_MARKER2, i1b)) < 0) {
      break;
    }
    // so e.g. in '[[v[0]]]' the end marker is correct
    while (s.indexOf(EXPR_MARKER2, i2a + 1) === i2a + 1) {
      i2a++;
    }
    
    if (i1a > i2b) {
      p.insertBefore(d.createTextNode(s.substring(i2b, i1a)), t);
    }
    p.insertBefore(d.createComment(page.TEXT_MARKER1_PREFIX + id), t);
    p.insertBefore(d.createComment(page.TEXT_MARKER2), t);

    i2b = i2a + EXPR_MARKER2.length;

    ret.push({
      key: page.TEXT_VALUE_PREFIX + id,
      val: s.substring(i1a, i2b)
    });
  }
  
  t.nodeValue = (i2b < s.length ? s.substring(i2b) : '');
}
