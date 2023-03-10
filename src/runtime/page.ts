import { regexMap } from "../preprocessor/util";
import { mixColors } from "./color";
import { Scope, ScopeCloning, ScopeProps } from "./scope";
import { Value } from "./value";

export const ELEMENT_NODE = 1; //TODO
export const TEXT_NODE = 3; //TODO
export const COMMENT_NODE = 8; //TODO

export const LOGIC_ATTR_PREFIX = ':';
export const URLPATH_ATTR = LOGIC_ATTR_PREFIX + 'URLPATH';
export const PAGEPATH_ATTR = LOGIC_ATTR_PREFIX + 'PAGEPATH';
export const AKA_ATTR = LOGIC_ATTR_PREFIX + 'aka';

export const DOM_ID_ATTR = 'data-reflectjs';
export const DOM_TEXTID_ATTR = 'data-reflectjs-text';
export const PROPS_SCRIPT_ID = 'reflectjs-props';
export const PROPS_JS_ID = 'reflectjs_props';
export const PAGE_JS_ID = 'reflectjs_page';
export const PAGE_READY_CB = 'onReflectJsReady';
export const RUNTIME_SCRIPT_ID = 'reflectjs-runtime';

export const ROOT_SCOPE_NAME = 'page';
export const HEAD_SCOPE_NAME = 'head';
export const BODY_SCOPE_NAME = 'body';

export const RESERVED_PREFIX = '__';
export const RESERVED_PASSIVE_PREFIX = RESERVED_PREFIX + '_';
export const OUTER_PROPERTY = RESERVED_PREFIX + 'outer';

export const EVENT_ATTR_PREFIX = 'on-';
export const HANDLER_ATTR_PREFIX = 'handle-';
export const CLASS_ATTR_PREFIX = 'class-';
export const STYLE_ATTR_PREFIX = 'style-';
export const WILL_HANDLER_ATTR_PREFIX = 'will-';
export const DID_HANDLER_ATTR_PREFIX = 'did-';

export const ATTR_VALUE_PREFIX = 'attr_';
export const EVENT_VALUE_PREFIX = 'on_';
export const HANDLER_VALUE_PREFIX = 'handle_';
export const CLASS_VALUE_PREFIX = 'class_';
export const STYLE_VALUE_PREFIX = 'style_';
export const WILL_HANDLER_VALUE_PREFIX = 'will_';
export const DID_HANDLER_VALUE_PREFIX = 'did_';

export const WILL_INIT_HANDLER_VALUE = WILL_HANDLER_VALUE_PREFIX + 'init';
export const DID_INIT_HANDLER_VALUE = DID_HANDLER_VALUE_PREFIX + 'init';

export const ID_VALUE = RESERVED_PREFIX + 'id';
export const DOM_VALUE = RESERVED_PREFIX + 'dom';
export const SCOPE_VALUE = RESERVED_PREFIX + 'scope';
export const ELEMENTINDEX_VALUE = RESERVED_PREFIX + 'elementIndex';
export const ISLASTELEMENT_VALUE = RESERVED_PREFIX + 'isLastElement';
export const MIXCOLORS_VALUE = RESERVED_PREFIX + 'mixColors';
export const REGEXMAP_VALUE = RESERVED_PREFIX + 'regexMap';
export const HIDDEN_VALUE = 'hidden';
export const DATA_VALUE = 'data';
export const DATA_OFFSET_VALUE = 'dataOffset';
export const DATA_LENGTH_VALUE = 'dataLength';
export const NESTFOR_VALUE = 'nestFor';
export const NESTIN_VALUE = 'nestIn';
export const TEXT_VALUE_PREFIX = RESERVED_PREFIX + 't';

export const TEXT_MARKER1_PREFIX = '-t';
export const TEXT_MARKER2 = '-/';

export const RESERVED_CSS_CLASS_PREFIX = 'refjs-';
export const HIDDEN_CLASS = RESERVED_CSS_CLASS_PREFIX + 'hidden';

export const NOTNULL_FN = RESERVED_PASSIVE_PREFIX + 'nn';

export interface PageProps {
  root: ScopeProps;
  cycle?: number;
}

/**
 * Page
 */
 export class Page {
  win: Window;
  doc: Document;
  dom: Element;
  props: PageProps;
  globals: Map<string, Value>;
  scopes: Map<string, Scope>;
  root: Scope;
  refreshLevel: number;
  pushLevel: number;

  constructor(win: Window, dom: Element, props: PageProps) {
    this.win = win;
    this.doc = dom.ownerDocument as unknown as Document;
    this.dom = dom;
    this.props = props;
    this.globals = new Map<string, Value>();
    this.setGlobal(NOTNULL_FN, (v: any) => v != null ? `${v}` : '');
    this.setGlobal('window', win);
    this.setGlobal('document', this.doc);
    this.setGlobal('isServer', Reflect.has(win, 'happyDOM'));
    this.setGlobal(MIXCOLORS_VALUE, mixColors);
    this.setGlobal(REGEXMAP_VALUE, regexMap);
    this.initEvents();
    this.scopes = new Map();
    this.root = this.load(null, props.root);
    this.root.values[ROOT_SCOPE_NAME] = new Value(ROOT_SCOPE_NAME, {
      val: this.root.proxy
    }, this.root);
    this.refreshLevel = this.pushLevel = 0;
  }

  load(parent: Scope | null, props: ScopeProps, cloned?: ScopeCloning): Scope {
    const ret = new Scope(this, parent, props, cloned);
    if (/*!ret.dom || */ret.dom.tagName !== 'TEMPLATE') {
      props.children?.forEach(props => {
        this.load(ret, props);
      });
    }
    return ret;
  }

  refresh(scope?: Scope, noincrement?: boolean, noupdate?: boolean) {
    this.refreshLevel++;
    try {
      this.props.cycle
        ? (noincrement ? null : this.props.cycle++)
        : this.props.cycle = 1;
      scope || (scope = this.root);
      scope.unlinkValues();
      scope.linkValues();
      noupdate ? null : scope.updateValues();
    } catch (ignored: any) {}
    this.refreshLevel--;
    return this;
  }

  setGlobal(key: string, val: any) {
    this.globals.set(key, new Value(key, { passive: true, val: val }));
  }

  lookupGlobal(key: string): Value | undefined {
    // let ret = this.globals.get(key);
    // if (!ret && Reflect.has(this.win, key)) {
    //   ret = new Value(key, { passive: true, val: Reflect.get(this.win, key) });
    //   this.globals.set(key, ret);
    // }
    // return ret;
    return this.globals.get(key);
  }

  getMarkup() {
    return '<!DOCTYPE html>' + this.doc.documentElement.outerHTML;
  }

  initEvents() {
    const origAdd = EventTarget.prototype.addEventListener;
    const origRemove = EventTarget.prototype.removeEventListener;

    const lookupScope = (e: any) => {
      if (e.hasAttribute) {
        while (e && !e.hasAttribute(DOM_ID_ATTR)) {
          e = e.parentElement;
        }
        if (e && e.getAttribute) {
          return this.scopes.get(e.getAttribute(DOM_ID_ATTR));
        }
      }
      return null;
    }

    EventTarget.prototype.addEventListener = function(type, callback, options) {
      const scope = lookupScope(this);
      scope && scope.addListener(this, type, callback, options);
      origAdd.call(this, type, callback, options);
    }

    EventTarget.prototype.removeEventListener = function(type, callback, options) {
      const scope = lookupScope(this);
      scope && scope.removeListener(this, type, callback, options);
      origRemove.call(this, type, callback, options);
    }
  }
}
