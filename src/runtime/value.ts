import { regexMap } from "../preprocessor/util";
import { ATTR_VALUE_PREFIX, EVENT_VALUE_PREFIX, TEXT_VALUE_PREFIX } from "./page";
import { Scope } from "./scope";

export interface ValueProps {
  val: any;
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
  // originalFnVal?: any;
  fnproxy?: any;

  constructor(key: string, props: ValueProps, scope?: Scope) {
    this.props = props;
    if ((this.scope = scope)) {
      if (key.startsWith(ATTR_VALUE_PREFIX)) {
        this.key = camelToHyphen(key.substring(ATTR_VALUE_PREFIX.length));
        this.dom = scope.dom;
        this.cb = Value.attrCB;
      } else if (key.startsWith(EVENT_VALUE_PREFIX)) {
        this.key = key.substring(EVENT_VALUE_PREFIX.length);
        this.dom = scope.dom;
        this.fnproxy = new Proxy(props.val, scope.proxyHandler);
        this.dom.addEventListener(this.key, (...ev: any[]) => this.fnproxy(...ev));
      } else if (key.startsWith(TEXT_VALUE_PREFIX)) {
        const i = parseInt(key.substring(TEXT_VALUE_PREFIX.length));
        this.dom = scope.texts ? scope.texts[i] : undefined;
        this.cb = Value.textCB;
      }
    }
    this.fn = props.fn as (() => any) | undefined;
  }

  static attrCB(v: Value) {
    if (v.props.val != null) {
      (v.dom as Element).setAttribute(v.key as string, `${v.props.val}`);
    } else {
      (v.dom as Element).removeAttribute(v.key as string);
    }
  }

  static textCB(v: Value) {
    (v.dom as Node).nodeValue = (v.props.val != null ? `${v.props.val}` : '');
  }
}

export function camelToHyphen(s: string) {
  return regexMap(/([0-9a-z][A-Z])/g, s, match => {
    const ret = s.charAt(match.index) + '-' + s.charAt(match.index + 1).toLowerCase();
    return ret;
  });
}
