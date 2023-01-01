import * as pg from "./page";
import * as vl from "./value";

export interface ScopeProps {
  id: string;
  name?: string;
  markup?: string;
  values?: ScopeValuesProps;
  children?: ScopeProps[];
}

export type ScopeValuesProps = {
  [key: string]: vl.ValueProps;
};

export interface ScopeCloning {
  from: Scope;
  dom: Element;
}

/**
 * Scope
 */
export class Scope {
  page: pg.Page;
  parent: Scope | null;
  props: ScopeProps;
  children: Scope[];
  cloned?: ScopeCloning;
  dom: Element;
  texts?: Node[];
  proxyHandler: ScopeProxyHandler;
  values: { [key: string]: vl.Value };
  proxy: any;
  clones?: Scope[];

  constructor(page: pg.Page, parent: Scope | null, props: ScopeProps, cloned?: ScopeCloning) {
    this.page = page;
    this.parent = parent;
    this.props = props;
    this.children = [];
    this.cloned = cloned;
    this.dom = this.initDom();
    this.texts = this.collectTextNodes();
    this.proxyHandler = new ScopeProxyHandler(page, this);
    this.values = this.initValues();
    this.proxy = new Proxy<any>(this.values, this.proxyHandler);
    !cloned && this.collectClones();
    if (parent) {
      parent.children.push(this);
      if (props.name && !cloned) {
        parent.values[props.name] = new vl.Value(props.name, {
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
      if (!this.cloned && this.props.name) {
        this.unlinkValue(this.parent.values[this.props.name]);
        delete this.parent.values[this.props.name];
      }
    }
    if (this.cloned) {
      const clones = this.cloned.from.clones ?? [];
      const i = clones.indexOf(this);
      i >= 0 && clones.splice(i, 1);
    }
  }

  clone(nr: number, dom?: Element): Scope {
    const props = Scope.cloneProps(this.props, nr);
    !dom && (dom = this.cloneDom(props.id));
    if (props.values && props.values[pg.DATA_VALUE]) {
      // clones are generated and updated based on original scope's data value;
      // their own data value is updated by the original scope
      delete props.values[pg.DATA_VALUE].refs;
      delete props.values[pg.DATA_VALUE].fn;
    }
    const dst = this.page.load(this.parent, props, { from: this, dom: dom });
    !this.clones && (this.clones = []);
    this.clones[nr] = dst;
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
      : this.initDomFromDomId(this.props.id);
    ret.setAttribute(pg.DOM_ID_ATTR, this.props.id);
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

  initDomFromDomId(id: string): Element {
    if (this.cloned) {
      return this.cloned.dom; //this.cloneOf?.dom?.previousElementSibling as Element;
    }
    const e = this.parent?.dom ?? this.page.doc;
    const ret = e.querySelector(`[${pg.DOM_ID_ATTR}="${id}"]`) as Element;
    return ret;
  }

  collectTextNodes() {
    const ret: Node[] = [];
    const f = (p: Element) => {
      p.childNodes.forEach(n => {
        if (
          n.nodeType === p.COMMENT_NODE &&
          n.nodeValue?.startsWith(pg.TEXT_MARKER1_PREFIX)
        ) {
          const s = n.nodeValue.substring(pg.TEXT_MARKER1_PREFIX.length);
          const i = parseInt(s);
          let t = n.nextSibling;
          if (t && t.nodeType !== p.TEXT_NODE) {
            t = p.insertBefore(this.page.doc.createTextNode(''), t);
          }
          ret[i] = t as Node;
        } else if (n.nodeType === p.ELEMENT_NODE) {
          if (!(n as Element).hasAttribute(pg.DOM_ID_ATTR)) {
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
    const ret: { [key: string]: vl.Value } = {};
    Reflect.ownKeys(this.props.values ?? {}).forEach(key => {
      const props = (this.props.values as any)[key];
      ret[key as string] = new vl.Value(key as string, props, this);
    });
    return ret;
  }

  lookupValue(prop: string, outer?: boolean): vl.Value | undefined {
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

  unlinkValue(value?: vl.Value) {
    if (value?.src) {
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
    this.children.forEach(s => {
      // clones are only directly refreshed by the original scope
      // (in dataCB() create)
      !s.cloned && s.updateValues();
    });
  }

  // ---------------------------------------------------------------------------
  // cloning
  // ---------------------------------------------------------------------------

  cloneDom(id: string): Element {
    const src = this.dom as Element;
    const dst = src.cloneNode(true) as Element;
    dst.setAttribute(pg.DOM_ID_ATTR, id);
    src.parentElement?.insertBefore(dst, src);
    return dst;
  }

  static cloneProps(src: ScopeProps, nr?: number): ScopeProps {
    const dst: ScopeProps = {
      id: nr != null ? `${src.id}.${nr}` : src.id,
      name: src.name,
      values: src.values ? Scope.cloneValues(src.values) : undefined
    };
    if (src.children) {
      dst.children = src.children.map(p => Scope.cloneProps(p));
    }
    return dst;
  }

  static cloneValues(src: ScopeValuesProps): ScopeValuesProps {
    const dst: ScopeValuesProps = {};
    for (const key of Reflect.ownKeys(src)) {
      if (typeof key === 'string') {
        dst[key] = Scope.cloneValue(src[key]);
      }
    }
    return dst;
  }

  static cloneValue(src: vl.ValueProps): vl.ValueProps {
    const dst: vl.ValueProps = {
      val: src._origVal ?? src.val,
      passive: src.passive,
      fn: src.fn,
      cycle: src.cycle,
      refs: src.refs
    };
    return dst;
  }

  collectClones() {
    const prefix = this.props.id + '.';
    let e = this.dom.previousElementSibling, s;
    if (!e || !e.getAttribute(pg.DOM_ID_ATTR)?.startsWith(prefix)) {
      return;
    }
    const preflen = prefix.length;
    while (e && (s = e.getAttribute(pg.DOM_ID_ATTR)) !== null && s.startsWith(prefix)) {
      const id = e.getAttribute(pg.DOM_ID_ATTR) as string;
      const i2 = id?.indexOf('.', preflen);
      const nr = parseInt(id.substring(preflen, (i2 >= 0 ? i2 : undefined)));
      const clone = this.clone(nr, e);
      clone.unlinkValues();
      clone.relinkValues();
      e = e.previousElementSibling;
    }
  }

  // ---------------------------------------------------------------------------
  // replication
  // ---------------------------------------------------------------------------

  static dataCB(v: vl.Value) {
    const that = v.scope as Scope;
    if (!v.props.val || !Array.isArray(v.props.val)) {
      if (that.clones && that.clones.length > 0) {
        that.removeExcessClones(0);
      }
      return;
    }
    // value is an array
    if (that.cloned) {
      // clones ignore array data
      v.props.val = null;
      return;
    }
    const vv: any[] = v.props.val;
    const offset = 0, length = vv.length;
    let ci = 0, di = offset;
    !that.clones && (that.clones = []);
    // create/update clones
    for (; di < (offset + length - 1); ci++, di++) {
      if (ci < that.clones.length) {
        // update
        that.clones[ci].proxy[pg.DATA_VALUE] = vv[di];
      } else {
        // create
        const clone = that.clone(ci);
        clone.values[pg.DATA_VALUE].props.val = vv[di];
        that.page.refresh(clone);
      }
    }
    // remove excess clones
    that.removeExcessClones(Math.max(0, length - 1));
    // refine data for the original scope
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
  page: pg.Page;
  scope: Scope;

  constructor(page: pg.Page, scope: Scope) {
    this.page = page;
    this.scope = scope;
  }

  get(target: any, prop: string, receiver?: any) {
    if (prop === pg.OUTER_PROPERTY) {
      return this.scope.parent?.proxy;
    }
    const value = this.scope.lookupValue(prop);
    value && !value.props.passive && this.update(value);
    return value?.props.val;
  }

  set(target: any, prop: string, val: any, receiver?: any) {
    if (prop.startsWith(pg.RESERVED_PREFIX)) {
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

  private update(value: vl.Value) {
    if (value.fn) {
      if (!value.props.cycle || value.props.cycle < (this.page.props.cycle ?? 0)) {
        value.props.cycle = this.page.props.cycle ?? 0;
        const old = value.props.val;
        try {
          value.props.val = value.fn.apply((value.scope as Scope).proxy);
        } catch (ex: any) {
          //TODO (+ use v.ValueProps.pos if available)
          console.log(ex);
        }
        if (old == null ? value.props.val != null : old !== value.props.val) {
          value.cb && value.cb(value);
          value.dst && this.page.refreshLevel < 1 && this.propagate(value);
        }
      }
    } else if (value.props.cycle == null) {
      value.props.cycle = this.page.props.cycle ?? 0;
      value.cb && value.cb(value);
    }
  }

  private propagate(value: vl.Value) {
    if (this.page.pushLevel < 1) {
      this.page.props.cycle = (this.page.props.cycle ?? 0) + 1;
    }
    this.page.pushLevel++;
    try {
      const that = this;
      (value.dst as Set<vl.Value>).forEach(function(v) {
        that.update(v);
      });
    } catch (ignored: any) {}
    this.page.pushLevel--;
  }
}
