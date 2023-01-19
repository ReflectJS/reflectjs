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

// =============================================================================
// Scope
// =============================================================================

export class Scope {
  page: pg.Page;
  parent: Scope | null;
  props: ScopeProps;
  children: Scope[];
  cloned?: ScopeCloning;
  nested?: ScopeCloning;
  dom: Element;
  texts?: Node[];
  proxyHandler: ScopeProxyHandler;
  values: { [key: string]: vl.Value };
  proxy: any;
  clones?: Scope[];
  nestings?: Scope[];

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
    this.collectNestings();
    if (parent) {
      parent.children.push(this);
      if (props.name && !cloned) {
        parent.values[props.name] = new vl.Value(props.name, {
          val: this.proxy,
          _origVal: this,
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
    if (this.nested) {
      const nestings = this.nested.from.nestings ?? [];
      const i = nestings.indexOf(this);
      i >= 0 && nestings.splice(i, 1);
    }
    if (this.nestings) {
      while (this.nestings.length > 0) {
        this.nestings.pop()?.dispose();
      }
    }
  }

  clone(nr: number, dom?: Element): Scope {
    const props = Scope.cloneProps(this.props, `|${nr}`);
    !dom && (dom = this.cloneDom(props.id));
    if (props.values && props.values[pg.DATA_VALUE]) {
      // clones are generated and updated based on original scope's data;
      // their own data value is updated by the original scope
      delete props.values[pg.DATA_VALUE].refs;
      delete props.values[pg.DATA_VALUE].fn;
    }
    const dst = this.page.load(this.parent, props, { from: this, dom: dom });
    !this.clones && (this.clones = []);
    this.clones[nr] = dst;
    return dst;
  }

  nest(nr: number, parent: Scope, dom?: Element): Scope {
    const props = Scope.cloneProps(this.props, `/${nr}`);
    !dom && (dom = this.nestDom(props.id, parent));
    if (props.values && props.values[pg.DATA_VALUE]) {
      // nestings are generated and updated based on original scope's data;
      // their own data value is updated by the original scope
      delete props.values[pg.DATA_VALUE].refs;
      delete props.values[pg.DATA_VALUE].fn;
    }
    const dst = this.page.load(parent, props, { from: this, dom: dom });
    !this.nestings && (this.nestings = []);
    this.nestings[nr] = dst;
    return dst;
  }

  get(key: string): any {
    return this.proxy[key];
  }

  trigger(key: string) {
    const value = this.values[key];
    value && this.proxyHandler.trigger(value);
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
    const collect = (p: Element) => {
      const textId = p.getAttribute(pg.DOM_TEXTID_ATTR);
      if (textId) {
        // this is a "dynamic-text-only" tag, e.g. a <style>
        if (p.childNodes.length != 1 || !p.firstChild || p.firstChild.nodeType !== pg.TEXT_NODE) {
          while (p.firstChild) {
            p.firstChild.remove();
          }
          p.appendChild(p.ownerDocument.createTextNode(''));
        }
        const i = parseInt(textId);
        ret[i] = p.firstChild as Node;
        return;
      }
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
            collect(n as Element);
          }
        }
      });
    }
    collect(this.dom);
    return ret.length > 0 ? ret : undefined;
  }

  elementIndex(e?: Element) {
    e || (e = this.dom);
    const cc = e.parentElement?.children;
    for (let i = 0; i < (cc ? cc.length : 0); i++) {
      if ((cc as HTMLCollection).item(i) === e) {
        return i;
      }
    }
    return NaN;
  }
  
  // ---------------------------------------------------------------------------
  // reactivity
  // ---------------------------------------------------------------------------

  initValues() {
    const that = this;
    const ret: { [key: string]: vl.Value } = {};
    Reflect.ownKeys(this.props.values ?? {}).forEach(key => {
      const props = (this.props.values as any)[key];
      ret[key as string] = new vl.Value(key as string, props, this);
    });
    ret[pg.ID_VALUE] = new vl.Value(pg.ID_VALUE, {
      val: this.props.id,
      passive: true,
    }, this);
    ret[pg.DOM_VALUE] = new vl.Value(pg.DOM_VALUE, {
      val: this.dom,
      passive: true,
    }, this);
    ret[pg.ELEMENTINDEX_VALUE] = new vl.Value(pg.ELEMENTINDEX_VALUE, {
      val: function(e: Element) { return that.elementIndex(e); },
      passive: true,
    }, this);
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

  lookupRef(ref: string, key: string): vl.Value | undefined {
    const parts = ref.split('.');
    let id = parts.shift();
    let scope: Scope | null = (id === key ? this.parent : this);
    let ret = id ? scope?.lookupValue(id) : undefined;
    while (
      parts.length > 0 &&
      ret &&
      ret.props._origVal &&
      typeof ret.props._origVal === 'object' &&
      ret.props._origVal instanceof Scope
    ) {
      scope = ret.props._origVal;
      const target = scope.values;
      id = parts.shift();
      const v = id ? Reflect.get(target, id, target) : undefined;
      v && (ret = v);
    }
    if (
      ret &&
      ret.props._origVal &&
      typeof ret.props._origVal === 'object' &&
      ret.props._origVal instanceof Scope
    ) {
      return undefined;
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

  linkValues() {
    for (const [key, value] of Object.entries(this.values)) {
      value.scope = this;
      value.props.refs?.forEach(id => {
        const other = this.lookupRef(id, key);
        if (other && !other.props.passive) {
          (value.src ?? (value.src = new Set())).add(other);
          (other.dst ?? (other.dst = new Set())).add(value);
        }
      });
    }
    this.children.forEach(s => s.linkValues());
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
    const dst = Scope.cloneElement(src);
    dst.setAttribute(pg.DOM_ID_ATTR, id);
    src.parentElement?.insertBefore(dst, src);
    return dst;
  }

  nestDom(id: string, parent: Scope): Element {
    const src = this.dom as Element;
    const srcId = src.getAttribute(pg.DOM_ID_ATTR) || '-';
    const dst = Scope.cloneElement(
      src,
      e => !(e.getAttribute(pg.DOM_ID_ATTR) || '').startsWith(srcId)
    );
    dst.setAttribute(pg.DOM_ID_ATTR, id);
    const nestInValue = this.values[pg.NESTIN_VALUE];
    const nestIn = (nestInValue ? nestInValue.props.val : null);
    const domParent: Element = (nestIn ? parent.dom.querySelector(nestIn) : parent.dom);
    domParent && domParent.appendChild(dst);
    return dst;
  }

  static cloneElement(src: Element, filter?: (e: Element) => boolean): Element {
    const doc = src.ownerDocument;

    function f(e: Element) {
      const ret = doc.createElement(e.tagName);
      for (let a of e.attributes) {
        ret.setAttribute(a.name, a.value);
      }
      for (let node of e.childNodes) {
        if (node.nodeType === pg.ELEMENT_NODE) {
          if (!filter || filter(node as Element)) {
            ret.appendChild(f(node as Element));
          }
        } else if (node.nodeType === pg.TEXT_NODE) {
          ret.appendChild(doc.createTextNode(node.nodeValue ?? ''));
        } else if (node.nodeType === pg.COMMENT_NODE) {
          ret.appendChild(doc.createComment(node.nodeValue ?? ''));
        }
      }
      return ret;
    }

    return f(src);
  }

  static cloneProps(src: ScopeProps, idSuffix?: string): ScopeProps {
    const dst: ScopeProps = {
      id: idSuffix != null ? `${src.id}${idSuffix}` : src.id,
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
    const prefix = this.props.id + '|';
    let e = this.dom.previousElementSibling, s;
    if (!e || !e.getAttribute(pg.DOM_ID_ATTR)?.startsWith(prefix)) {
      return;
    }
    const preflen = prefix.length;
    while (e && (s = e.getAttribute(pg.DOM_ID_ATTR)) !== null && s.startsWith(prefix)) {
      const id = e.getAttribute(pg.DOM_ID_ATTR) as string;
      const nr = parseInt(id.substring(preflen));
      const clone = this.clone(nr, e);
      clone.unlinkValues();
      clone.linkValues();
      e = e.previousElementSibling;
    }
  }

  collectNestings() {
    const prefix = this.props.id + '/';
    const preflen = prefix.length;
    const nestInValue = this.values[pg.NESTIN_VALUE];
    const nestIn = (nestInValue ? nestInValue.props.val : null);
    const domParent: Element = (nestIn ? this.dom.querySelector(nestIn) : this.dom);
    if (domParent) {
      Array.from(domParent.children).forEach(e => {
        if (e.getAttribute(pg.DOM_ID_ATTR)?.startsWith(prefix)) {
          const id = e.getAttribute(pg.DOM_ID_ATTR) as string;
          const nr = parseInt(id.substring(preflen));
          const nesting = this.nest(nr, this, e);
          nesting.unlinkValues();
          nesting.linkValues();
        }
      });
    }
  }

  // ---------------------------------------------------------------------------
  // replication
  // ---------------------------------------------------------------------------

  static dataCB(v: vl.Value) {
    const that = v.scope as Scope;
    if (!Array.isArray(v.props.val)) {
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

    let offset = 0, length = vv.length;
    try {
      if (that.values[pg.DATA_OFFSET_VALUE]) {
        offset = that.proxy[pg.DATA_OFFSET_VALUE] - 0;
      }
    } catch (ignored: any) {}
    try {
      if (that.values[pg.DATA_LENGTH_VALUE]) {
        length = that.proxy[pg.DATA_LENGTH_VALUE] - 0;
      }
    } catch (ignored: any) {}
    offset < 0 && (offset = 0);
    offset > vv.length && (offset = vv.length);
    length < 0 && (length = vv.length);
    (offset + length) >= vv.length && (length = vv.length - offset);

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
    } else {
      v.props.val = null;
    }
  }

  removeExcessClones(maxCount: number) {
    if (this.clones) {
      while (this.clones.length > maxCount) {
        this.clones.pop()?.dispose();
      }
    }
  }

  // called by DATA_OFFSET_VALUE and DATA_LENGTH_VALUE
  static dataWindowCB(v: vl.Value) {
    v.scope?.trigger(pg.DATA_VALUE);
  }

  // ---------------------------------------------------------------------------
  // nesting
  // ---------------------------------------------------------------------------

  static nestForCB(v: vl.Value) {
    const that = v.scope as Scope;
    if (!Array.isArray(v.props.val) || !v.scope) {
      if (that.nestings && that.nestings.length > 0) {
        that.removeExcessNestings(0);
      }
      return;
    }
    // value is an array
    if (that.nested) {
      // clones ignore array data
      v.props.val = null;
      return;
    }
    const vv: any[] = v.props.val;
    const offset = 0, length = vv.length;
    let ci = 0, di = offset;
    !that.nestings && (that.nestings = []);
    // create/update nestings
    for (; di < (offset + length); ci++, di++) {
      const vi = vv[di];
      if (ci < that.nestings.length) {
        // update
        that.nestings[ci].proxy[pg.DATA_VALUE] = vi;
      } else {
        // create
        const nesting = that.nest(ci, v.scope);
        nesting.values[pg.DATA_VALUE].props.val = vi;
        that.page.refresh(nesting);
      }
    }
    // remove excess nestings
    that.removeExcessNestings(Math.max(0, length));
  }

  removeExcessNestings(maxCount: number) {
    if (this.nestings) {
      while (this.nestings.length > maxCount) {
        this.nestings.pop()?.dispose();
      }
    }
  }
}

// =============================================================================
// ScopeProxyHandler
// =============================================================================

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

  trigger(value: vl.Value) {
    value.cb && value.cb(value);
    this.propagate(value);
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
