import express, { Application, Express } from "express";
import rateLimit from 'express-rate-limit';
import fs from "fs";
import { Window } from "happy-dom";
import * as http from 'http';
import path from "path";
import { compileDoc, PageError } from "../compiler/page-compiler";
import { HtmlDocument } from "../preprocessor/htmldom";
import Preprocessor, { EMBEDDED_INCLUDE_FNAME } from "../preprocessor/preprocessor";
import { Page, PROPS_SCRIPT_ID, RUNTIME_SCRIPT_ID, RUNTIME_URL } from "../runtime/page";
import exitHook from "./exit-hook";
import { STDLIB } from "./stdlib";

const SERVER_PAGE_TIMEOUT = 2000;

export interface ServerProps {
  port?: number,
  rootPath: string,
  assumeHttps?: boolean,
  trustProxy?: boolean,
  pageLimit?: TrafficLimit,
  init?: (props: ServerProps, app: Application) => void,
  logger?: (type: string, msg: string) => void,
  mute?: boolean,
  clientJsFilePath?: string,
  serverPageTimeout?: number,
  normalizeText?: boolean,
}

export interface TrafficLimit {
  windowMs: number,
  maxRequests: number,
}

// https://expressjs.com/en/advanced/best-practice-performance.html
export default class ServerImpl {
  props: ServerProps;
  compiledPages: Map<string, CompiledPage>;
  serverPageTimeout: number;
  normalizeText: boolean;
  server: http.Server;
  clientJs?: string;

  constructor(props: ServerProps, cb?: (port: number) => void) {
    this.props = props;
    this.compiledPages = new Map();
    this.normalizeText = props.normalizeText !== undefined ? props.normalizeText : true;
    this.serverPageTimeout = props.serverPageTimeout ?? SERVER_PAGE_TIMEOUT;
    const app = express();

    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));
    if (props.trustProxy) {
      // see https://expressjs.com/en/guide/behind-proxies.html
      app.set('trust proxy', 1);
    }

    props.init && props.init(props, app);
    this.init(props, app);

    // serve static content
    app.use(express.static(props.rootPath));

    const listenCB = () => {
      const port = (this.server.address() as any).port;
      if (cb) {
        cb(port);
      } else {
        this.log('info', `${this.getTimestamp()}: START `
          + `http://localhost:${port} [${props.rootPath}]`);
      }
    }

    this.server = props.port
      ? app.listen(props.port, listenCB)
      : app.listen(listenCB);

    exitHook(() => {
      this.log('info', 'WILL EXIT');
    });

    process.on('uncaughtException', (err) => {
      this.log('error', err.stack ? err.stack : `${err}`);
    });
  }

  close() {
    this.server.close();
  }

  log(type:string, msg:string) {
    if (!this.props.mute) {
      if (this.props.logger) {
        this.props.logger(type, msg);
      } else {
        switch (type) {
          case 'error': console.error(msg); break;
          case 'info': console.info(msg); break;
          case 'warn': console.warn(msg); break;
          default: console.log(msg);
        }
      }
    }
  }

  static setLimiter(limit: TrafficLimit, paths: Array<string>, app: Application) {
    const limiter = rateLimit({
      windowMs: limit.windowMs,
      max: limit.maxRequests,
      standardHeaders: true,
      legacyHeaders: false,
    });
    for (var path of paths) {
      app.use(path, limiter);
    }
  }

  // ---------------------------------------------------------------------------
  // private
  // ---------------------------------------------------------------------------

  private getTimestamp(): string {
    const d = new Date();
    return d.getFullYear() + '-'
        + ('' + (d.getMonth() + 1)).padStart(2, '0') + '-'
        + ('' + d.getDate()).padStart(2, '0') + ' '
        + ('' + d.getHours()).padStart(2, '0') + ':'
        + ('' + d.getMinutes()).padStart(2, '0') + ':'
        + ('' + d.getSeconds()).padStart(2, '0');
  }

  private init(props: ServerProps, app: Express) {
    // limit page requests rate
    if (props.pageLimit) {
      ServerImpl.setLimiter(props.pageLimit, ['*', '*.html'], app);
    }

    // externally redirect requests for directories to <dir>/index
    // internally redirect requests to files w/o suffix to <file>.html
    app.get("*", async (req, res, next) => {
      if (/^[^\.]+$/.test(req.url)) {
        // no suffix
        var base = `http://${req.headers.host}`;
        var url = new URL(req.url, base);
        var pathname = path.join(props.rootPath, url.pathname);
        try {
          const stat = await fs.promises.stat(pathname);
          if (!stat.isDirectory()) {
            throw '';
          }
          if (url.pathname.endsWith('/')) {
            req.url = path.join(req.url, 'index.html');
            next('route');
          } else {
            res.redirect(req.url + '/index');
          }
        } catch (ex: any) {
          req.url = req.url + '.html';
          next('route');
        }
      } else {
        // has suffix
        next('route');
      }
    });

    // serve pages
    const that = this;
    app.get('*.html', async (req, res) => {
      var base = `http://${req.headers.host}`;
      var url = new URL(req.url, base);
      url.protocol = (props.assumeHttps ? 'https' : req.protocol);
      url.hostname = req.hostname;
      try {
        const page = await that.getPage(url);
        if (page.errors) {
          throw page.errors.map(pe => `${pe.type}: ${pe.msg}`).join('\n');
        }
        res.header("Content-Type",'text/html');
        res.send(page.output ?? '');
      } catch (err: any) {
        res.header("Content-Type",'text/plain');
        res.send(`${err}`);
        that.log('error', `${that.getTimestamp()}: `
          + `ERROR ${url.toString()}: ${err}`);
      }
    });

    // load client runtime
    if (props.clientJsFilePath) {
      this.clientJs = fs.readFileSync(props.clientJsFilePath, { encoding: 'utf8'});
    }
  }

  async getPage(url: URL): Promise<ExecutedPage> {
    const compiledPage = await this.getCompiledPage(url);
    if (compiledPage.errors && compiledPage.errors.length > 0) {
      return {
        compiledPage: compiledPage,
        output: '',
        errors: compiledPage.errors.slice()
      }
    }
    return this.executePage(url, compiledPage);
  }

  async getCompiledPage(url: URL): Promise<CompiledPage> {
    const cachedPage = this.compiledPages.get(url.pathname);
    if (cachedPage && await this.isCompiledPageFresh(cachedPage)) {
      return cachedPage;
    }
    console.log('cache miss for "' + url.pathname + '"');//tempdebug
    const ret = await this.compilePage(url);
    this.compiledPages.set(url.pathname, ret);
    return ret;
  }

  async compilePage(url: URL): Promise<CompiledPage> {
    const ret: any = {
      tstamp: Date.now()
    };
    try {
      const pathname = decodeURIComponent(url.pathname);
      const pre = new Preprocessor(this.props.rootPath);
      ret.doc = await pre.read(pathname, STDLIB) as HtmlDocument;
      if (!ret.doc) {
        throw `failed to load page "${pathname}"`;
      }
      ret.files = pre.parser.origins;
      const { js, errors } = compileDoc(ret.doc);
      if (errors.length > 0) {
        throw errors;
      }
      ret.js = js;
    } catch (err: any) {
      if (Array.isArray(err)) {
        ret.errors = err;
      } else {
        ret.errors = [{ type: 'error', msg: `${err}` }];
      }
    }
    return ret;
  }

  async isCompiledPageFresh(compiledPage: CompiledPage): Promise<boolean> {
    for (const file of compiledPage.files) {
      if (file === EMBEDDED_INCLUDE_FNAME) {
        continue;
      }
      try {
        const stat = await fs.promises.stat(file);
        if (stat.mtime.valueOf() > compiledPage.tstamp) {
          return false;
        }
      } catch (err: any) {
        return false;
      }
    }
    return true;
  }

  async executePage(url: URL, compiledPage: CompiledPage): Promise<ExecutedPage> {
    const ret: ExecutedPage = { compiledPage: compiledPage };
    const doc = compiledPage.doc as HtmlDocument;
    const js = compiledPage.js as string;
    try {
      const win = new Window({
        url: url.toString(),
        // https://github.com/capricorn86/happy-dom/tree/master/packages/happy-dom#settings
        settings: {
          disableJavaScriptFileLoading: true,
          disableJavaScriptEvaluation: true,
          disableCSSFileLoading: true,
          enableFileSystemHttpRequests: false
        }
      } as any);

      // server side we don't support delays longer than zero
      const origSetTimeout = win.setTimeout;
      win.setTimeout = (callback, delay) => {
        return (delay ?? 0) < 1 ? origSetTimeout(callback, 0) : {} as NodeJS.Timeout;
      };
      win.setInterval = (callback, delay) => ({} as NodeJS.Timeout);

      win.document.write(doc.toString(false, false, this.normalizeText));
      const root = win.document.documentElement as unknown as Element;
      const props = eval(`(${js})`);
      const page = new Page(win as any, root, props);
      page.refresh();

      const propsScript = win.document.createElement('script');
      propsScript.id = PROPS_SCRIPT_ID;
      propsScript.setAttribute('type', 'text/json');
      propsScript.appendChild(win.document.createTextNode(`\n${js}\n`));
      win.document.body.appendChild(propsScript);
      win.document.body.appendChild(win.document.createTextNode('\n'));

      const runtimeScript = win.document.createElement('script');
      runtimeScript.id = RUNTIME_SCRIPT_ID;
      runtimeScript.setAttribute('src', RUNTIME_URL);
      win.document.body.appendChild(runtimeScript);
      win.document.body.appendChild(win.document.createTextNode('\n'));

      await Promise.race([
        win.happyDOM.whenAsyncComplete(),
        new Promise<void>(resolve => {
          setTimeout(() => {
            win.happyDOM.cancelAsync();
            resolve();
          }, this.serverPageTimeout);
        })
      ])

      await new Promise(resolve => setTimeout(resolve, 0));
      ret.output = `<!DOCTYPE html>\n` + win.document.documentElement.outerHTML;
    } catch (err: any) {
      if (Array.isArray(err)) {
        ret.errors = err;
      } else {
        ret.errors = [{ type: 'error', msg: `${err}` }];
      }
    }
    return ret;
  }
}

type CompiledPage = {
  tstamp: number,
  files: string[],
  html: string,
  doc: HtmlDocument,
  js: string,
  errors?: PageError[]
}

type ExecutedPage = {
  compiledPage: CompiledPage,
  output?: string,
  errors?: PageError[]
}
