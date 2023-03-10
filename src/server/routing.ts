import fs from "fs";
import { join } from "path";
import { URLPATH_ATTR } from "../runtime/page";

export class Routing {
  rootPath: string;
  rules: Array<{ prefix: string, pathname: string }>;
  pages: Set<string>;

  constructor(rootPath: string, cb?: (instance: Routing) => void) {
    this.rootPath = rootPath;
    this.rules = [];
    this.pages = new Set();
    this.update().finally(() => cb && cb(this));
  }

  async update() {
    const that = this;
    const re = new RegExp(`${URLPATH_ATTR}="(.+?)"`);
    const files = new Set<string>();
    const rules = new Array<{ prefix: string, pathname: string }>
    async function f(path: string) {
      const list = await fs.promises.readdir(join(that.rootPath, path));
      for (let name of list) {
        const relpath = join(path, name);
        const abspath = join(that.rootPath, relpath);
        const stat = await fs.promises.stat(abspath);
        if (stat.isDirectory()) {
          await f(relpath);
        } else if (stat.isFile() && name.endsWith('.html')) {
          files.add(relpath);
          const text = await that.read(abspath, 1000);
          const r = re.exec(text);
          if (r && r.length > 1) {
            rules.push({ prefix: path + r[1], pathname: relpath });
          }
        }
      }
    }
    await f('/');
    rules.sort((a, b) => b.prefix.length - a.prefix.length);
    this.rules = rules;
    this.pages = files;
  }

  async route(pathname: string): Promise<string> {
    if (!this.pages.has(pathname)) {
      for (let rule of this.rules) {
        if (pathname.startsWith(rule.prefix)) {
          return rule.pathname;
        }
      }
    }
    return pathname;
  }

  // ===========================================================================
  // private
  // ===========================================================================

  private async read(pathname: string, size: number): Promise<string> {
    const stream = fs.createReadStream(pathname, { encoding: 'utf-8' });
    return new Promise<string>((resolve, reject) => {
      const chunks = new Array<string>();
      let size = 0;
      stream.on('data', data => {
        chunks.push('' + data);
        if ((size += data.length) > size) {
          stream.close();
        }
      });
      stream.on('close', () => {
        resolve(chunks.join(''));
      });
    });
  }

}
