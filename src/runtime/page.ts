import { IDocument, IHTMLElement, Window } from "happy-dom";
import { Scope, ScopeProps } from "./scope";
import { Value } from "./value";

export const ELEMENT_NODE = 1; //TODO
export const TEXT_NODE = 3; //TODO
export const COMMENT_NODE = 8; //TODO

export const DOM_ID_ATTR = 'data-rsj';

export const ROOT_SCOPE_NAME = 'page';
export const HEAD_SCOPE_NAME = 'head';
export const BODY_SCOPE_NAME = 'body';

export const RESERVED_PREFIX = '__';
export const OUTER_PROPERTY = RESERVED_PREFIX + 'outer';
export const ATTR_VALUE_PREFIX = 'attr_';
export const TEXT_VALUE_PREFIX = RESERVED_PREFIX + 't';

export const TEXT_MARKER_PREFIX = '-t';

export interface PageProps {
  root: ScopeProps;
  cycle?: number;
}

export class Page {
  win: Window;
  doc: IDocument;
  dom: IHTMLElement;
  props: PageProps;
  root: Scope;
  pushLevel?: number;

  constructor(win: Window, dom: IHTMLElement, props: PageProps) {
    this.win = win;
    this.doc = dom.ownerDocument;
    this.dom = dom;
    this.props = props;
    this.root = this.load(null, props.root);
    this.root.values[ROOT_SCOPE_NAME] = new Value({
      key: ROOT_SCOPE_NAME,
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
    this.props.cycle ? (noincrement ? null : this.props.cycle++) : this.props.cycle = 1;
    delete this.pushLevel;
    scope || (scope = this.root);
    scope.unlinkValues();
    scope.relinkValues();
    scope.updateValues();
    this.pushLevel = 0;
    return this;
  }

  globalLookup(key: string): Value | undefined {
    return undefined;
  }

  get markup() {
    return new this.win.XMLSerializer().serializeToString(this.doc);
  }
}
