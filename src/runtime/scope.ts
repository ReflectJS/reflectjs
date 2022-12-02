import { IElement } from "happy-dom";
import { Page } from "./page";
import { Value, ValueProps } from "./value";

const DOM_ID_ATTR = 'data-rsj';

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
        parent.values[props.name] = new Value({
          key: props.name,
          val: this.obj
        });
      }
    }
    this.dom = this.initDom();
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

  initValues() {
    const ret = {};
    return ret;
  }
}
