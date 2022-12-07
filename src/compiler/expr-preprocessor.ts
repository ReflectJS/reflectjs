import { StringBuf } from "../preprocessor/util";
import { NOTNULL_FN } from "../runtime/page";

export const EXPR_MARKER1 = '[[';
export const EXPR_MARKER2 = ']]';

export interface Expr {
  src: string,
  fndecl?: boolean,
  origin?: string,
  lineNr?: number,
}

export function isDynamic(s: any) {
  let i;
  return (
    s != null &&
    typeof s === 'string' &&
    (i = s.indexOf(EXPR_MARKER1)) >= 0 &&
    s.indexOf(EXPR_MARKER2) > i
  );
}

export function preprocess(s: string, origin?: string, lineNr = 1): Expr {
  var src = preprocessIt(s);
  return { src: src, origin: origin, lineNr: lineNr };
}

function preprocessIt(s: string): string {
  var sb = new StringBuf();
  var sep = '';
  var exprStart, exprEnd;
  if (s.startsWith(EXPR_MARKER1) && s.endsWith(EXPR_MARKER2)) {
    exprStart = '(';
    exprEnd = ')';
  } else {
    exprStart = NOTNULL_FN + '(';
    exprEnd = ')';
  }
  var i = 0, i1, i2;
  while ((i1 = s.indexOf(EXPR_MARKER1, i)) >= 0
      && (i2 = s.indexOf(EXPR_MARKER2, i1)) >= 0) {
    while ((i2 + 2) < s.length && s.charAt(i2 + 2) === ']') i2++;
    sb.add(sep); sep = '+';
    if (i1 > i) {
      sb.add("'" + escape(s.substring(i, i1)) + "'+");
    }
    let e = s.substring(i1 + EXPR_MARKER1.length, i2);
    if (e.trim().length > 0) {
      sb.add(exprStart);
      sb.add(e);
      sb.add(exprEnd);
    }
    i = i2 + EXPR_MARKER2.length;
  }
  if (i < s.length || sep === '') {
    sb.add(sep);
    sb.add("'" + escape(s.substring(i)) + "'");
  }
  return sb.toString();
}

function escape(s: string): string {
  s = s.replace(/\\/g, "\\\\");
  s = s.replace(/'/g, "\\'");
  s = s.replace(/"/g, '\\"');
  s = s.replace(/\n/g, '\\n');
  s = s.replace(/\r/g, '\\r');
  return s;
}
