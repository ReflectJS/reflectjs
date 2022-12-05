import { COMMENT_NODE, DOM_ID_ATTR, ELEMENT_NODE, OUTER_PROPERTY, Page, RESERVED_PREFIX, TEXT_MARKER1_PREFIX, TEXT_NODE } from "./page";
import { Value, ValueProps } from "./value";

export interface ScopeProps {
  id: number;
  name?: string;
  query?: string;
  markup?: string;
  values?: { [key: string]: ValueProps };
  children?: ScopeProps[];
}

/**
 * Scope
 */
export class Scope {
  page: Page;
  parent: Scope | null;
  props: ScopeProps;
  children: Scope[];
  dom: Element;
  texts?: Node[];
  values: { [key: string]: Value };
  proxy: any;

  constructor(page: Page, parent: Scope | null, props: ScopeProps) {
    this.page = page;
    this.parent = parent;
    this.props = props;
    this.children = [];
    this.dom = this.initDom();
    this.texts = this.collectTextNodes();
    this.values = this.initValues();
    this.proxy = new Proxy<any>(this.values, new ScopeProxyHandler(page, this));
    if (parent) {
      parent.children.push(this);
      if (props.name) {
        parent.values[props.name] = new Value(props.name, {
          val: this.proxy,
          passive: true
        }, parent);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // dom
  // ---------------------------------------------------------------------------

  initDom() {
    const ret = this.props.markup
      ? this.initDomFromMarkup(this.props.markup)
      : this.initDomFromDomQuery(this.props.query as string);
    ret.setAttribute(DOM_ID_ATTR, `${this.props.id}`);
    return ret;
  }

  initDomFromMarkup(markup: string): Element {
    const p = (this.parent as Scope);
    const doc = p.dom.ownerDocument;
    const div = doc.createElement('div');
    div.innerHTML = markup;
    const ret = div.firstElementChild as Element;
    div.removeChild(ret);
    p.dom.appendChild(ret);
    return ret;
  }

  initDomFromDomQuery(query: string): Element {
    return this.page.doc.querySelector(query) as Element;
  }

  collectTextNodes() {
    const ret: Node[] = [];
    const f = (p: Element) => {
      p.childNodes.forEach(n => {
        if (
          n.nodeType === COMMENT_NODE &&
          n.nodeValue?.startsWith(TEXT_MARKER1_PREFIX)
        ) {
          const s = n.nodeValue.substring(TEXT_MARKER1_PREFIX.length);
          const i = parseInt(s);
          let t = n.nextSibling;
          if (t && t.nodeType !== TEXT_NODE) {
            t = p.insertBefore(this.page.doc.createTextNode(''), t);
          }
          ret[i] = t as Node;
        } else if (n.nodeType === ELEMENT_NODE) {
          if (!(n as Element).hasAttribute(DOM_ID_ATTR)) {
            f(n as Element);
          }
        }
      });
    }
    f(this.dom);
    return ret.length > 0 ? ret : undefined;
  }

  // ---------------------------------------------------------------------------
  // reactivity
  // ---------------------------------------------------------------------------

  initValues() {
    const ret: { [key: string]: Value } = {};
    Reflect.ownKeys(this.props.values ?? {}).forEach(key => {
      const props = (this.props.values as any)[key];
      ret[key as string] = new Value(key as string, props, this);
    });
    // this.props.values?.forEach(props => {
    //   ret[props.key] = new Value(props, this);
    // });
    return ret;
  }

  lookupValue(prop: string, outer?: boolean): Value | undefined {
    let ret = undefined;
    let scope: Scope | null = (outer ? this.parent : this);
    while (scope && !ret) {
      const target = scope.values;
      ret = Reflect.get(target, prop, target);
      scope = scope.parent;
    }
    if (!ret) {
      ret = this.page.lookupGlobal(prop);
    }
    return ret;
  }

  unlinkValues() {
    for (const [key, value] of Object.entries(this.values)) {
      if (value.src) {
        value.src.forEach(o => o?.dst?.delete(value));
        delete value.src;
      }
    }
    this.children.forEach(s => s.unlinkValues());
  }

  relinkValues() {
    for (const [key, value] of Object.entries(this.values)) {
      value.scope = this;
      value.props.refs?.forEach(id => {
        const other = this.lookupValue(id, id === key);
        if (other && !other.props.passive) {
          (value.src ?? (value.src = new Set())).add(other);
          (other.dst ?? (other.dst = new Set())).add(value);
        }
      });
    }
    this.children.forEach(s => s.relinkValues());
  }

  updateValues() {
    Object.keys(this.proxy).forEach(k => this.proxy[k]);
    this.children.forEach(s => s.updateValues());
  }
}

/**
 * ScopeProxyHandler
 */
class ScopeProxyHandler implements ProxyHandler<any> {
  page: Page;
  scope: Scope;

  constructor(page: Page, scope: Scope) {
    this.page = page;
    this.scope = scope;
  }

  get(target: any, prop: string, receiver?: any) {
    if (prop === OUTER_PROPERTY) {
      return this.scope.parent?.proxy;
    }
    const value = this.scope.lookupValue(prop);
    value && !value.props.passive && this.update(value);
    return value?.props.val;
  }

  set(target: any, prop: string, val: any, receiver?: any) {
    if (prop.startsWith(RESERVED_PREFIX)) {
      return false;
    }
    const value = this.scope.lookupValue(prop);
    if (value && !value.props.passive) {
      const old = value.props.val;
      value.props.val = val;
      delete value.fn;
      if (old == null ? value.props.val != null : old !== value.props.val) {
        value.cb && value.cb(value);
        this.propagate(value);
      }
    }
    return !!value;
  }

  private update(value: Value) {
    if (value.fn) {
      if (!value.props.cycle || value.props.cycle < (this.page.props.cycle ?? 0)) {
        value.props.cycle = this.page.props.cycle ?? 0;
        const old = value.props.val;
        try {
          value.props.val = value.fn.apply((value.scope as Scope).proxy);
        } catch (ex: any) {
          //TODO (+ use ValueProps.pos if available)
          console.log(ex);
        }
        if (old == null ? value.props.val != null : old !== value.props.val) {
          value.cb && value.cb(value);
          value.dst && this.propagate(value);
        }
      }
    } else if (value.props.cycle == null) {
      value.props.cycle = this.page.props.cycle ?? 0;
      value.cb && value.cb(value);
    }
  }

  private propagate(value: Value) {
    if (this.page.pushLevel != null) {
      if ((this.page.pushLevel ?? 0) === 0) {
        this.page.props.cycle = (this.page.props.cycle ?? 0) + 1;
      }
      this.page.pushLevel++;
      try {
        const that = this;
        (value.dst as Set<Value>).forEach(function(v) {
          that.update(v);
        });
      } catch (ignored: any) {}
      this.page.pushLevel--;
    }
  }
}
