import { Scope, ScopeProps } from "./scope";
import { Value } from "./value";

export const ELEMENT_NODE = 1; //TODO
export const TEXT_NODE = 3; //TODO
export const COMMENT_NODE = 8; //TODO

export const LOGIC_ATTR_PREFIX = ':';
export const AKA_ATTR = LOGIC_ATTR_PREFIX + 'aka';

export const DOM_ID_ATTR = 'data-reflectjs';
export const PROPS_SCRIPT_ID = 'reflectjs-props';
export const PROPS_JS_ID = 'reflectjs_props';
export const PAGE_JS_ID = 'reflectjs_page';
export const PAGE_LOADED_EVENT = 'reflectjsDidLoad';
export const RUNTIME_SCRIPT_ID = 'reflectjs-runtime';
export const RUNTIME_URL = '/.reflectjs/runtime.js';

export const ROOT_SCOPE_NAME = 'page';
export const HEAD_SCOPE_NAME = 'head';
export const BODY_SCOPE_NAME = 'body';

export const RESERVED_PREFIX = '__';
export const OUTER_PROPERTY = RESERVED_PREFIX + 'outer';
export const ATTR_VALUE_PREFIX = 'attr_';
export const EVENT_VALUE_PREFIX = 'on_';
export const HANDLER_VALUE_PREFIX = 'handle_';
export const EVENT_ATTR_PREFIX = 'on-';
export const HANDLER_ATTR_PREFIX = 'handle-';
export const DATA_VALUE = 'data';
export const TEXT_VALUE_PREFIX = RESERVED_PREFIX + 't';

export const TEXT_MARKER1_PREFIX = '-t';
export const TEXT_MARKER2 = '-/';

export const NOTNULL_FN = RESERVED_PREFIX + 'nn';

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
  root: Scope;
  pushLevel?: number;

  constructor(win: Window, dom: Element, props: PageProps) {
    this.win = win;
    this.doc = dom.ownerDocument as unknown as Document;
    this.dom = dom;
    this.props = props;
    this.globals = new Map<string, Value>();
    this.root = this.load(null, props.root);
    this.root.values[ROOT_SCOPE_NAME] = new Value(ROOT_SCOPE_NAME, {
      val: this.root.proxy
    }, this.root);
  }

  load(parent: Scope | null, props: ScopeProps, cloneOf?: Scope) {
    const ret = new Scope(this, parent, props, cloneOf);
    props.children?.forEach(props => {
      this.load(ret, props);
    });
    return ret;
  }

  refresh(scope?: Scope, noincrement?: boolean) {
    this.props.cycle
      ? (noincrement ? null : this.props.cycle++)
      : this.props.cycle = 1;
    delete this.pushLevel;
    scope || (scope = this.root);
    scope.unlinkValues();
    scope.relinkValues();
    scope.updateValues();
    this.pushLevel = 0;
    return this;
  }

  lookupGlobal(key: string): Value | undefined {
    let ret = this.globals.get(key);
    if (!ret && Reflect.has(this.win, key)) {
      ret = new Value(key, { passive: true, val: Reflect.get(this.win, key) });
      this.globals.set(key, ret);
    }
    return ret;
  }

  getMarkup() {
    return '<!DOCTYPE html>' + this.doc.documentElement.outerHTML;
  }
}
