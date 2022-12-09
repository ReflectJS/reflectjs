import { Window } from "happy-dom";
import { Scope, ScopeProps } from "./scope";
import { Value } from "./value";

export const ELEMENT_NODE = 1; //TODO
export const TEXT_NODE = 3; //TODO
export const COMMENT_NODE = 8; //TODO

export const LOGIC_ATTR_PREFIX = ':';
export const AKA_ATTR = LOGIC_ATTR_PREFIX + 'aka';

export const DOM_ID_ATTR = 'data-reflectjs';

export const ROOT_SCOPE_NAME = 'page';
export const HEAD_SCOPE_NAME = 'head';
export const BODY_SCOPE_NAME = 'body';

export const RESERVED_PREFIX = '__';
export const OUTER_PROPERTY = RESERVED_PREFIX + 'outer';
export const ATTR_VALUE_PREFIX = 'attr_';
export const EVENT_VALUE_PREFIX = 'on_';
export const HANDLER_VALUE_PREFIX = 'handle_';
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
    this.globals = this.initGlobals();
    this.root = this.load(null, props.root);
    this.root.values[ROOT_SCOPE_NAME] = new Value(ROOT_SCOPE_NAME, {
      val: this.root.proxy
    }, this.root);
  }

  load(parent: Scope | null, props: ScopeProps) {
    const ret = new Scope(this, parent, props);
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

  initGlobals(): Map<string, Value> {
    const ret = new Map<string, Value>();
    ret.set('window', new Value('', { passive: true, val: this.win }));
    ret.set('document', new Value('', { passive: true, val: this.doc }));
    ret.set('console', new Value('', { passive: true, val: this.win.console }));
    ret.set('setTimeout', new Value('', { passive: true, val: this.win.setTimeout }));
    ret.set('setInterval', new Value('', { passive: true, val: this.win.setInterval }));
    return ret;
  }

  lookupGlobal(key: string): Value | undefined {
    return this.globals.get(key);
  }

  getMarkup() {
    return '<!DOCTYPE html>' + this.doc.documentElement.outerHTML;
  }
}
