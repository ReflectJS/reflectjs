import { IDocument, IElement } from "happy-dom";

export const DOM_ID_ATTR = 'data-rjs';

// =============================================================================
// Scope
// =============================================================================

export class Scope {
  page: Page;
  parent: Scope | null;
  id: number;

  markup: string | IElement;
  name?: string;
  values: { [key: string]: Value };
  dom: IElement;

  constructor(parent: Scope | null, markup: string | IElement, name?: string) {
    this.page = (parent ? parent.page : this as unknown as Page);
    this.parent = parent;
    this.id = this.page.getNextScopeId();
    this.markup = markup;
    this.name = name;
    this.values = {};
    this.dom = this.init();
  }

  init(): IElement {
    const ret = typeof this.markup === 'string'
      ? this.initFromMarkup(this.markup)
      : this.markup;
    const addValue = (props: ValueProps, name?: string) => {
      name ?? (name = `__${this.page.getNextValueId()}`);
      this.values[name] = new Value(props);
    }
    const keys = ret.getAttributeNames();
    for (const key of keys) {
      if (key.startsWith(':')) {
        addValue({type: 'value', val: ret.getAttribute(key) }, key.substring(1));
        ret.removeAttribute(key);
      }
    }
    ret.setAttribute(DOM_ID_ATTR, `${this.id}`);
    return ret;
  }

  initFromMarkup(markup: string): IElement {
    const p = (this.parent as Scope);
    const doc = p.dom.ownerDocument;
    const div = doc.createElement('div');
    div.innerHTML = markup;
    const ret = div.firstElementChild;
    div.removeChild(ret);
    p.dom.appendChild(ret);
    return ret;
  }
}

// =============================================================================
// Page
// =============================================================================

export class Page extends Scope {
  nextScopeId?: number;
  nextValueId?: number;
  
  constructor(doc: IDocument, name?: string) {
    super(null, doc.documentElement, name);
  }

  getNextScopeId() {
    this.page.nextScopeId == null ? this.page.nextScopeId = 0 : null;
    return this.page.nextScopeId++;
  }

  getNextValueId() {
    this.page.nextValueId == null ? this.page.nextValueId = 0 : null;
    return this.page.nextValueId++;
  }
}

// =============================================================================
// Value
// =============================================================================

export interface ValueProps {
  type: 'value';
  key?: string;
  val?: any;
}

export class Value {
  props: ValueProps;

  constructor(props: ValueProps) {
    this.props = props;
  }
}
