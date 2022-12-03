import { IDocument, IHTMLElement } from "happy-dom";
import { Scope, ScopeProps } from "./scope";
import { Value } from "./value";

export const ELEMENT_NODE = 1; //TODO
export const TEXT_NODE = 3; //TODO
export const COMMENT_NODE = 8; //TODO

export const DOM_ID_ATTR = 'data-rsj';

export const ROOT_SCOPE_NAME = 'page';
export const HEAD_SCOPE_NAME = 'head';
export const BODY_SCOPE_NAME = 'body';

export const ATTR_VALUE_PREFIX = 'attr_';
export const TEXT_VALUE_PREFIX = '__t';

export const TEXT_MARKER_PREFIX = '-t';

export interface PageProps {
  root: ScopeProps;
}

export class Page {
  doc: IDocument;
  dom: IHTMLElement;
  props: PageProps;
  root: Scope;

  constructor(dom: IHTMLElement, props: PageProps) {
    this.doc = dom.ownerDocument;
    this.dom = dom;
    this.props = props;
    this.root = this.load(null, props.root);
    this.root.values[ROOT_SCOPE_NAME] = new Value(this.root, {
      key: ROOT_SCOPE_NAME,
      val: this.root.obj
    });
  }

  load(parent: Scope | null, props: ScopeProps) {
    const ret = new Scope(this, parent, props);
    props.children?.forEach(props => {
      this.load(ret, props);
    });
    return ret;
  }

  get markup() {
    return this.dom.outerHTML;
  }
}
