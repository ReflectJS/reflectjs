import { COMMENT_NODE, DATA_VALUE, DOM_ID_ATTR, ELEMENT_NODE, OUTER_PROPERTY, Page, RESERVED_PREFIX, TEXT_MARKER1_PREFIX, TEXT_NODE } from "./page";
import { Value, ValueProps } from "./value";

export interface ScopeProps {
  id: string;
  name?: string;
  query?: string;
  markup?: string;
  values?: ScopeValuesProps;
  children?: ScopeProps[];
}

export type ScopeValuesProps = { [key: string]: ValueProps };

/**
 * Scope
 */
export class Scope {
  page: Page;
  parent: Scope | null;
  props: ScopeProps;
  children: Scope[];
  cloneOf?: Scope;
  dom: Element;
  texts?: Node[];
  proxyHandler: ScopeProxyHandler;
  values: { [key: string]: Value };
  proxy: any;
  clones?: Scope[];

  constructor(page: Page, parent: Scope | null, props: ScopeProps, cloneOf?: Scope) {
    this.page = page;
    this.parent = parent;
    this.props = props;
    this.children = [];
    this.cloneOf = cloneOf;
    this.dom = this.initDom();
    this.texts = this.collectTextNodes();
    this.proxyHandler = new ScopeProxyHandler(page, this);
    this.values = this.initValues();
    this.proxy = new Proxy<any>(this.values, this.proxyHandler);
    if (parent) {
      parent.children.push(this);
      if (props.name && !cloneOf) {
        parent.values[props.name] = new Value(props.name, {
          val: this.proxy,
          passive: true
        }, parent);
      }
    }
  }

  dispose() {
    this.dom.remove();
    this.unlinkValues();
    if (this.parent) {
      const i = this.parent.children.indexOf(this);
      i >= 0 && this.parent.children.splice(i, 1);
      if (!this.cloneOf && this.props.name) {
        this.unlinkValue(this.parent.values[this.props.name]);
        delete this.parent.values[this.props.name];
      }
    }
    if (this.cloneOf) {
      const clones = this.cloneOf.clones ?? [];
      const i = clones.indexOf(this);
      i >= 0 && clones.splice(i, 1);
    }
  }

  clone(nr: number): Scope {
    const props = this.cloneProps(nr);
    const dom = this.cloneDom(props.id);
    if (props.values && props.values[DATA_VALUE]) {
      // clones are generated and updated based on original scope's data value;
      // their own data value is updated by the original scope
      delete props.values[DATA_VALUE].refs;
    }
    const dst = this.page.load(this.parent, props, this);
    !this.clones && (this.clones = []);
    this.clones.push(dst);
    this.page.refresh(dst);
    return dst;
  }

  get(key: string): any {
    return this.proxy[key];
  }

  // ---------------------------------------------------------------------------
  // dom
  // ---------------------------------------------------------------------------

  initDom() {
    const ret = this.props.markup
      ? this.initDomFromMarkup(this.props.markup)
      : this.initDomFromDomQuery(this.props.query as string);
    ret.setAttribute(DOM_ID_ATTR, this.props.id);
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
    if (this.cloneOf) {
      return this.cloneOf?.dom?.previousElementSibling as Element;
    }
    const e = this.parent?.dom ?? this.page.doc;
    const ret = e.querySelector(query) as Element;
    return ret;
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
      this.unlinkValue(value);
    }
    this.children.forEach(s => s.unlinkValues());
  }

  unlinkValue(value: Value) {
    if (value.src) {
      value.src.forEach(o => o?.dst?.delete(value));
      delete value.src;
    }
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
    Object.keys(this.values).forEach(k => {
      const v = this.values[k];
      !v.props.passive && this.proxy[k];
    });
    this.children.forEach(s => s.updateValues());
  }

  // ---------------------------------------------------------------------------
  // cloning
  // ---------------------------------------------------------------------------

  cloneDom(id: string): Element {
    const src = this.dom as Element;
    const dst = src.cloneNode(true) as Element;
    dst.setAttribute(DOM_ID_ATTR, id);
    src.parentElement?.insertBefore(dst, src);
    return dst;
  }

  cloneProps(nr: number): ScopeProps {
    const dst: ScopeProps = {
      id: `${this.props.id}.${nr}`,
      name: this.props.name,
      query: `[${DOM_ID_ATTR}="${this.props.id}.${nr}"]`,
      values: this.cloneValues()
    };
    return dst;
  }

  cloneValues(): ScopeValuesProps | undefined {
    if (!this.props.values) {
      return undefined;
    }
    const dst: ScopeValuesProps = {};
    for (const key of Reflect.ownKeys(this.props.values)) {
      if (typeof key === 'string') {
        dst[key] = this.cloneValue(key);
      }
    }
    return dst;
  }

  cloneValue(key: string): ValueProps {
    const src = (this.props.values as ScopeValuesProps)[key];
    const dst: ValueProps = {
      val: src._origVal ?? src.val,
      passive: src.passive,
      fn: src.fn,
      cycle: src.cycle,
      refs: src.refs
    };
    return dst;
  }

  // ---------------------------------------------------------------------------
  // replication
  // ---------------------------------------------------------------------------

  static dataCB(v: Value) {
    const that = v.scope as Scope;
    if (!v.props.val || !Array.isArray(v.props.val)) {
      if (that.clones && that.clones.length > 0) {
        that.removeExcessClones(0);
      }
      return;
    }
    // value is an array
    const vv: any[] = v.props.val;
    const offset = 0, length = vv.length;
    let ci = 0, di = offset;
    !that.clones && (that.clones = []);
    // create/update clones
    for (; di < (offset + length - 1); ci++, di++) {
      if (ci < that.clones.length) {
        that.clones[ci].proxy[DATA_VALUE] = vv[di];
      } else {
        const clone = that.clone(ci);
        clone.proxy[DATA_VALUE] = vv[di];
      }
    }
    // remove excess clones
    that.removeExcessClones(Math.max(0, length - 1));
    // update original scope
    if (di < (offset + length)) {
      v.props.val = vv[di];
    }
  }

  removeExcessClones(maxCount: number) {
    if (this.clones) {
      while (this.clones.length > maxCount) {
        this.clones.pop()?.dispose();
      }
    }
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

  apply(target: any, thisArg: any, argumentsList: any[]) {
    return target.apply(this.scope.proxy, argumentsList);
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
