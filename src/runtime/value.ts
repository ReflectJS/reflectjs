import { regexMap } from "../preprocessor/util";
import * as pg from "./page";
import { Scope } from "./scope";

export interface ValueProps {
  val: any;
  _origVal?: any;
  domKey?: string;
  passive?: boolean;
  fn?: (() => any) | string;
  cycle?: number;
  refs?: string[];
}

/**
 * Value
 */
export class Value {
  props: ValueProps;
  scope?: Scope;
  key?: string;
  dom?: Node;
  cb?: (v: any) => void;
  fn?: () => any;
  src?: Set<Value>;
  dst?: Set<Value>;
  classParts?: Set<string>;
  styleParts?: Map<string, string>;

  constructor(key: string, props: ValueProps, scope?: Scope) {
    this.props = props;
    if ((this.scope = scope)) {
      if (props.passive && typeof props.val === 'function') {
        const proxy = new Proxy(props.val, scope.proxyHandler);
        props._origVal = props.val;
        props.val = (...args: any[]) => proxy(...args);
      }
      if (key.startsWith(pg.ATTR_VALUE_PREFIX)) {
        this.key = camelToHyphen(key.substring(pg.ATTR_VALUE_PREFIX.length));
        this.dom = scope.dom;
        const keyLC = this.key.toLowerCase();
        if (keyLC === 'class') {
          this.classParts = new Set();
          this.cb = attrClassCB;
        } else if (keyLC === 'style') {
          this.styleParts = new Map();
          this.cb = attrStyleCB;
        } else {
          this.cb = attrCB;
        }
      } else if (key.startsWith(pg.EVENT_VALUE_PREFIX)) {
        this.key = props.domKey as string;
        this.dom = scope.dom;
        this.dom.addEventListener(this.key, (ev) => props.val(ev));
      } else if (key === pg.HIDDEN_VALUE) {
        this.dom = scope.dom;
        this.cb = hiddenCB;
      } else if (key.startsWith(pg.CLASS_VALUE_PREFIX)) {
        this.key = camelToHyphen(key.substring(pg.CLASS_VALUE_PREFIX.length));
        this.dom = scope.dom;
        this.cb = classCB;
      } else if (key.startsWith(pg.STYLE_VALUE_PREFIX)) {
        this.key = camelToHyphen(key.substring(pg.STYLE_VALUE_PREFIX.length));
        this.dom = scope.dom;
        this.cb = styleCB;
      } else if (key.startsWith(pg.TEXT_VALUE_PREFIX)) {
        const i = parseInt(key.substring(pg.TEXT_VALUE_PREFIX.length));
        this.dom = scope.texts ? scope.texts[i] : undefined;
        this.cb = textCB;
      } else if (key === pg.DATA_VALUE) {
        this.cb = Scope.dataCB;
      } else if (key === pg.DATA_OFFSET_VALUE || key === pg.DATA_LENGTH_VALUE) {
        this.cb = Scope.dataWindowCB;
      } else if (key === pg.NESTFOR_VALUE) {
        this.cb = Scope.nestForCB;
      }
    }
    this.fn = props.fn as (() => any) | undefined;
  }
}

export function camelToHyphen(s: string) {
  return regexMap(/([0-9a-z][A-Z])/g, s, match =>
    s.charAt(match.index) + '-' + s.charAt(match.index + 1).toLowerCase()
  );
}

export function attrCB(v: Value) {
  if (v.props.val != null) {
    (v.dom as Element).setAttribute(v.key as string, `${v.props.val}`);
  } else {
    (v.dom as Element).removeAttribute(v.key as string);
  }
}

export function hiddenCB(v: Value) {
  if (v.props.val) {
    (v.dom as Element).setAttribute('hidden', '');
  } else {
    (v.dom as Element).removeAttribute('hidden');
  }
}

export function attrClassCB(v: Value) {
  const oldParts = v.classParts as Set<string>;
  const newParts = new Set<string>((v.props.val || "").trim().split(/\s+/));
  newParts.forEach((part) => {
    if (!oldParts.has(part)) {
      (v.dom as Element).classList.add(part);
    }
  });
  oldParts.forEach((part) => {
    if (!newParts.has(part)) {
      (v.dom as Element).classList.remove(part);
    }
  });
  v.classParts = newParts;
}

export function classCB(v: Value) {
  if (v.props.val) {
    (v.dom as Element).classList.add(v.key as string);
  } else {
    (v.dom as Element).classList.remove(v.key as string);
  }
}

export function attrStyleCB(v: Value) {
  const oldParts = v.styleParts as Map<string, string>;
  const newParts = new Map<string, string>();
  const pp1 = (v.props.val || "").trim().split(/\s*;\s*/) as string[];
  pp1.forEach(p1 => {
    const pp2 = p1.split(/\s*:\s*/);
    if (pp2.length > 1 && pp2[0] && pp2[1]) {
      newParts.set(pp2[0], pp2[1]);
    }
  });
  newParts.forEach((val, key) => {
    (v.dom as HTMLElement).style.setProperty(key, val);
  });
  oldParts.forEach((val, key) => {
    if (!newParts.has(key)) {
      (v.dom as HTMLElement).style.removeProperty(key);
    }
  });
  v.styleParts = newParts;
}

export function styleCB(v: Value) {
  if (v.props.val) {
    (v.dom as HTMLElement).style.setProperty(v.key as string, `${v.props.val}`);
  } else {
    (v.dom as HTMLElement).style.removeProperty(v.key as string);
  }
}

export function textCB(v: Value) {
  (v.dom as Node).nodeValue = (v.props.val != null ? `${v.props.val}` : '');
}

export function dataCB(v: Value) {
  if (!v.props.val || !Array.isArray(v.props.val)) {
    return;
  }
  console.log('dataCB', v.props.val);
  v.props.val = v.props.val.length > 0 ? v.props.val[0] : null;
}
