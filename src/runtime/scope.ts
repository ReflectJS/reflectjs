import { IElement, INode } from "happy-dom";
import { COMMENT_NODE, DOM_ID_ATTR, ELEMENT_NODE, Page, TEXT_MARKER_PREFIX, TEXT_NODE } from "./page";
import { Value, ValueProps } from "./value";

export interface ScopeProps {
  id: number;
  name?: string;
  query?: string;
  markup?: string;
  values?: ValueProps[];
  children?: ScopeProps[];
}

export class Scope {
  page: Page;
  parent: Scope | null;
  props: ScopeProps;
  children: Scope[];
  obj: any;
  dom: IElement;
  texts?: INode[];
  values: { [key: string]: Value };

  constructor(page: Page, parent: Scope | null, props: ScopeProps) {
    this.page = page;
    this.parent = parent;
    this.props = props;
    this.children = [];
    this.obj = {};
    if (parent) {
      parent.children.push(this);
      if (props.name) {
        parent.values[props.name] = new Value(parent, {
          key: props.name,
          val: this.obj
        });
      }
    }
    this.dom = this.initDom();
    this.texts = this.collectTexts();
    this.values = this.initValues();
  }

  initDom() {
    const ret = this.props.markup
      ? this.initDomFromMarkup(this.props.markup)
      : this.initDomFromDomQuery(this.props.query as string);
    ret.setAttribute(DOM_ID_ATTR, `${this.props.id}`);
    return ret;
  }

  initDomFromMarkup(markup: string): IElement {
    const p = (this.parent as Scope);
    const doc = p.dom.ownerDocument;
    const div = doc.createElement('div');
    div.innerHTML = markup;
    const ret = div.firstElementChild;
    div.removeChild(ret);
    p.dom.appendChild(ret);
    return ret;
  }

  initDomFromDomQuery(query: string) {
    return this.page.doc.querySelector(query);
  }

  collectTexts() {
    const ret: INode[] = [];
    const f = (p: IElement) => {
      p.childNodes.forEach(n => {
        if (
          n.nodeType === COMMENT_NODE &&
          n.nodeValue.startsWith(TEXT_MARKER_PREFIX)
        ) {
          const s = n.nodeValue.substring(TEXT_MARKER_PREFIX.length);
          const i = parseInt(s);
          let t = n.nextSibling;
          if (t.nodeType !== TEXT_NODE) {
            t = p.insertBefore(this.page.doc.createTextNode(''), t);
          }
          ret[i] = t;
        } else if (n.nodeType === ELEMENT_NODE) {
          f(n as IElement);
        }
      });
    }
    f(this.dom);
    return ret.length > 0 ? ret : undefined;
  }

  initValues() {
    const ret: { [key: string]: Value } = {};
    this.props.values?.forEach(props => {
      ret[props.key] = new Value(this, props);
    });
    return ret;
  }
}
