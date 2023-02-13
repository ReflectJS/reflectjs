import { regexMap } from "../preprocessor/util";
import { mixColors } from "./color";
import { Scope, ScopeCloning, ScopeProps } from "./scope";
import { Value } from "./value";

export const ELEMENT_NODE = 1; //TODO
export const TEXT_NODE = 3; //TODO
export const COMMENT_NODE = 8; //TODO

export const LOGIC_ATTR_PREFIX = ':';
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
export const ATTR_VALUE_PREFIX = 'attr_';
export const EVENT_VALUE_PREFIX = 'on_';
export const HANDLER_VALUE_PREFIX = 'handle_';
export const CLASS_VALUE_PREFIX = 'class_';
export const STYLE_VALUE_PREFIX = 'style_';
export const EVENT_ATTR_PREFIX = 'on-';
export const HANDLER_ATTR_PREFIX = 'handle-';
export const CLASS_ATTR_PREFIX = 'class-';
export const STYLE_ATTR_PREFIX = 'style-';
export const ID_VALUE = RESERVED_PREFIX + 'id';
export const DOM_VALUE = RESERVED_PREFIX + 'dom';
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
    this.root = this.load(null, props.root);
    this.root.values[ROOT_SCOPE_NAME] = new Value(ROOT_SCOPE_NAME, {
      val: this.root.proxy
    }, this.root);
    this.refreshLevel = this.pushLevel = 0;
  }

  load(parent: Scope | null, props: ScopeProps, cloned?: ScopeCloning) {
    const ret = new Scope(this, parent, props, cloned);
    props.children?.forEach(props => {
      this.load(ret, props);
    });
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
}
