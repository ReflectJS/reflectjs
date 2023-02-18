import { ELEMENT_NODE, TEXT_NODE } from "../preprocessor/dom";
import { HtmlAttribute, HtmlDocument, HtmlElement, HtmlText } from "../preprocessor/htmldom";
import { regexMap } from "../preprocessor/util";
import * as page from "../runtime/page";
import { ScopeProps } from "../runtime/scope";
import { ValueProps } from "../runtime/value";
import { EXPR_MARKER1, EXPR_MARKER2, isDynamic } from "./expr-preprocessor";
import { PageError } from "./page-compiler";

const WHOLE_TEXT_TAGS: any = { STYLE: true, TITLE: true };
const STATIC_TEXT_TAGS: any = { SCRIPT: true };

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
    id: e.getAttribute(page.DOM_ID_ATTR) as string
  };
  const values = new Map<string, ValueProps>();
  const children = new Array<ScopeProps>();

  switch (e.tagName) {
    case 'HTML':
      ret.name = page.ROOT_SCOPE_NAME;
      break;
    case 'HEAD':
      ret.name = page.HEAD_SCOPE_NAME;
      break;
    case 'BODY':
      ret.name = page.BODY_SCOPE_NAME;
      break;
  }
  e.getAttribute(page.AKA_ATTR) && (ret.name = e.getAttribute(page.AKA_ATTR));
  e.removeAttribute(page.AKA_ATTR);

  function scan(p: HtmlElement) {
    const staticText = STATIC_TEXT_TAGS[p.tagName];
    p.childNodes.forEach(n => {
      if (n.nodeType === ELEMENT_NODE) {
        if ((n as HtmlElement).getAttribute(page.DOM_ID_ATTR) != null) {
          children.push(loadScope((n as HtmlElement), errors));
        } else {
          scan(n as HtmlElement);
        }
      } else if (!staticText && n.nodeType === TEXT_NODE) {
        if (isDynamic((n as HtmlText).nodeValue)) {
          if (WHOLE_TEXT_TAGS[p.tagName]) {
            const textId = loadText(n as HtmlText, values, errors);
            p.setAttribute(page.DOM_TEXTID_ATTR, `${textId}`);
          } else {
            loadTexts(n as HtmlText, values, errors);
          }
        }
      }
    });
  }
  scan(e);
  loadValues(e, values, errors);

  (values.size > 0) && (ret.values = Object.fromEntries(values));
  (children.length > 0) && (ret.children = children);
  return ret;
}

function loadValues(e: HtmlElement, ret: Map<string, ValueProps>, errors: PageError[]) {
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
  key: string, attr: HtmlAttribute, ret: Map<string, ValueProps>, errors: PageError[]
) {
  let domKey = null;
  if (key.startsWith(page.EVENT_ATTR_PREFIX)) {
    domKey = key.substring(page.EVENT_ATTR_PREFIX.length);
    key = page.EVENT_VALUE_PREFIX + hyphenToCamel(domKey);
  } else if (key.startsWith(page.HANDLER_ATTR_PREFIX)) {
    key = page.HANDLER_VALUE_PREFIX + hyphenToCamel(key.substring(page.HANDLER_ATTR_PREFIX.length));
  } else if (key.startsWith(page.CLASS_ATTR_PREFIX)) {
    key = page.CLASS_VALUE_PREFIX + hyphenToCamel(key.substring(page.CLASS_ATTR_PREFIX.length));
  } else if (key.startsWith(page.STYLE_ATTR_PREFIX)) {
    key = page.STYLE_VALUE_PREFIX + hyphenToCamel(key.substring(page.STYLE_ATTR_PREFIX.length));
  } else {
    key = hyphenToCamel(key);
  }
  const props: ValueProps = {
    val: attr.quote === '[' ? `[[${attr.value}]]` : attr.value
  };
  domKey && (props.domKey = domKey);
  ret.set(key, props);
}

function loadTexts(t: HtmlText, ret: Map<string, ValueProps>, errors: PageError[]) {
  const d = t.ownerDocument as HtmlDocument;
  const p = t.parentElement as HtmlElement;
  const s = t.nodeValue;

  let i1a, i1b, i2a, i2b = 0, id;
  while ((i1a = s.indexOf(EXPR_MARKER1, i2a)) >= i2b) {
    id = ret.size;
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

    ret.set(page.TEXT_VALUE_PREFIX + id, {
      val: s.substring(i1a, i2b)
    });
  }

  t.nodeValue = (i2b < s.length ? s.substring(i2b) : '');
}

function loadText(t: HtmlText, ret: Map<string, ValueProps>, errors: PageError[]) {
  // const expr = preprocess(t.nodeValue);//TODO: t.pos
  const id = ret.size;
  ret.set(page.TEXT_VALUE_PREFIX + id, {
    val: t.nodeValue
  });
  t.nodeValue = '';
  return id;
}

export function hyphenToCamel(s: string) {
  return regexMap(/([\-\.].)/g, s, match => {
    return s.substring(match.index + 1, match.index + 2).toUpperCase();
  });
}
