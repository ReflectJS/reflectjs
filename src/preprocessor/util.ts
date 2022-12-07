
export class StringBuf {
  parts: string[];

  constructor() {
    this.parts = [];
  }

  add(s: string) {
    this.parts.push(s);
  }

  toString() {
    return this.parts.join('');
  }
}

export function normalizeText(s?: string): string | undefined {
  return s?.split(/\n\s+/).join('\n').split(/\s{2,}/).join(' ');
}

export function normalizeSpace(s?: string): string | undefined {
  return s?.split(/\s+/).join(' ');
}

// export function makeCamelName(n: string): string {
//   // @ts-ignore
//   return new EReg('(\\-\\w)', 'g').map(n, function (re: EReg): string {
//     return n.substr(re.matchedPos().pos + 1, 1).toUpperCase();
//   });
// }

// export function makeHyphenName(n: string): string {
//   // @ts-ignore
//   return new EReg('([0-9a-z][A-Z])', 'g').map(n, function (re: EReg): string {
//     var p = re.matchedPos().pos;
//     return n.substr(p, 1).toLowerCase() + '-' + n.substr(p + 1, 1).toLowerCase();
//   });
// }

export function regexMap(
  re: RegExp, s: string, cb: (match: RegExpExecArray) => string
): string {
  const _re = re.flags.indexOf('g') >= 0 ? re : new RegExp(re, 'g' + re.flags);
  let sb = new StringBuf(), i = 0;
  for (let match; !!(match = _re.exec(s)); i = match.index + match.length) {
    match.index > i && sb.add(s.substring(i, match.index));
    sb.add(cb(match));
  }
  s.length > i && sb.add(s.substring(i));
  return sb.toString();
}
