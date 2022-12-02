import { IDocument, IHTMLElement } from "happy-dom";
import { Scope, ScopeProps } from "./scope";
import { Value } from "./value";

export const ROOT_SCOPE_NAME = 'page';
export const HEAD_SCOPE_NAME = 'head';
export const BODY_SCOPE_NAME = 'body';

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
    this.root.values[ROOT_SCOPE_NAME] = new Value({
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
