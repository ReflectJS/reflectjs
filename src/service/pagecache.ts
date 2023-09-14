import fs from "fs";
import { Window } from "happy-dom";
import path from "path";
import { compileDoc, PageError } from "../compiler/page-compiler";
import { DomElement } from "../preprocessor/dom";
import { HtmlDocument } from "../preprocessor/htmldom";
import Preprocessor, { EMBEDDED_INCLUDE_FNAME } from "../preprocessor/preprocessor";
import { EXTURLS_ATTR, LIVERELOAD_SCRIPT_ID, PAGENAME_ATTR, PAGEPATH_ATTR, PROPS_SCRIPT_ID, RUNTIME_SCRIPT_ID, URLPATH_ATTR } from "../runtime/page";
import { CLIENT_JS_FILE, SERVER_NOCLIENT_PARAM, SERVER_PAGE_TIMEOUT, ServerLogger, ServerProps } from "../server";
import { Routing } from "./routing";
import { STDLIB } from "./stdlib";
const chokidar = require('chokidar');

const SUFFIXES = new Set(['.html', '.htm']);

export class PageCache {
  props: ServerProps;
  invalidateCB: () => void;
  logger: ServerLogger;
  normalizeText: boolean;
  compiledPages: Map<string, CompiledPage>;
  serverPageTimeout: number;
  clientJs: string;
  routing?: Routing;

  constructor(props: ServerProps, invalidateCB: () => void, logger: ServerLogger) {
    this.props = props;
    this.invalidateCB = invalidateCB;
    this.logger = logger;
    this.normalizeText = props.normalizeText !== undefined ? props.normalizeText : true;
    this.compiledPages = new Map();
    this.serverPageTimeout = props.serverPageTimeout ?? SERVER_PAGE_TIMEOUT;
    // load client runtime
    const p = props.__clientJsFilePath ?? path.resolve(__dirname, '..', CLIENT_JS_FILE);
    this.clientJs = '\n' + fs.readFileSync(p, { encoding: 'utf8'});
    // page monitor
    chokidar.watch(props.rootPath).on('all', (event: string, filename?: string) => {
      if (!filename || SUFFIXES.has(path.extname(filename))) {
        this.invalidate(filename);
      }
    });
  }

  setRouting(routing: Routing) {
    this.routing = routing;
  }

  invalidate(relname?: string) {
    const size = this.compiledPages.size;
    if (!relname) {
      this.compiledPages.clear();
    } else {
      const absname = path.join(this.props.rootPath, relname);
      for (const p of Array.from(this.compiledPages)) {
        const pageName = p[0];
        const compiledPage: CompiledPage = p[1];
        if (compiledPage.files.includes(absname)) {
          // this.logger('DEBUG', `PageCache.invalidate() "${pageName}"`);
          this.compiledPages.delete(pageName);
        }
      }
    }
    if (this.compiledPages.size !== size) {
      this.invalidateCB();
    }
  }

  async getPage(url: URL, originalUrl: string, filePath: string, liveSocketsPort?: number): Promise<ExecutedPage> {
    const compiledPage = await this.getCompiledPage(url, filePath);
    if (compiledPage.errors && compiledPage.errors.length > 0) {
      return {
        compiledPage: compiledPage,
        output: '',
        errors: compiledPage.errors.slice()
      }
    }
    return this.executePage(url, originalUrl, compiledPage, liveSocketsPort);
  }

  protected async getCompiledPage(url: URL, filePath: string): Promise<CompiledPage> {
    const cachedPage = this.compiledPages.get(filePath);
    if (cachedPage) {
      return cachedPage;
    }
    const ret = await this.compilePage(url, filePath);
    if (!ret.errors || !ret.errors.length) {
      this.compiledPages.set(filePath, ret);
    }
    return ret;
  }

  protected async compilePage(url: URL, filePath: string): Promise<CompiledPage> {
    const ret: CompiledPage = {
      tstamp: Date.now(),
      files: [],
      output: '<html></html>'
    };
    try {
      const fname = decodeURIComponent(filePath);
      const pre = new Preprocessor(this.props.rootPath);
      const doc = await pre.read(fname, STDLIB);
      if (!doc) {
        throw `failed to load page "${filePath}"`;
      }
      this.addRoutingAttributes(doc, fname);
      ret.files = pre.parser.origins;
      const { js, errors } = compileDoc(doc);
      if (errors.length > 0) {
        throw errors;
      }

      const propsScript: DomElement = doc.createElement('script');
      propsScript.setAttribute('id', PROPS_SCRIPT_ID);
      propsScript.setAttribute('type', 'text/json');
      propsScript.appendChild(doc.createTextNode(`\n${js}\n`));
      doc.body?.appendChild(propsScript);
      doc.body?.appendChild(doc.createTextNode('\n'));

      ret.output = doc.toString(false, false, this.normalizeText);
    } catch (err: any) {
      if (Array.isArray(err)) {
        ret.errors = err;
      } else {
        ret.errors = [{ type: 'error', msg: `${err}` }];
      }
    }
    // this.logger('DEBUG', `PageCache.compilePage(): "${filePath}"`);
    return ret;
  }

  protected addRoutingAttributes(doc: HtmlDocument, fname: string) {
    const rootElement = doc.firstElementChild;
    if (!this.routing || !rootElement?.getAttribute(URLPATH_ATTR)) {
      return;
    }
    const urlPath = rootElement.getAttribute(URLPATH_ATTR) as string;
    const dirName = path.dirname(fname);
    const pagePath = dirName.endsWith('/') ? dirName : dirName + '/';
    const pageName = path.basename(fname);
    rootElement.setAttribute(PAGEPATH_ATTR, pagePath);
    rootElement.setAttribute(PAGENAME_ATTR, pageName);
    const prefix = path.join(pagePath, urlPath);
    const extUrls = [];
    for (let r of this.routing.rules) {
      r.prefix.startsWith(prefix) && r.prefix != prefix && extUrls.push(encodeURI(r.prefix));
    }
    for (let p of this.routing.pages) {
      p.startsWith(prefix) && extUrls.push(encodeURI(p));
    }
    extUrls.length && rootElement.setAttribute(EXTURLS_ATTR, extUrls.join(' '));
  }

  protected async executePage(url: URL, originalUrl: string, compiledPage: CompiledPage, liveSocketsPort?: number): Promise<ExecutedPage> {
    const ret: ExecutedPage = { compiledPage: compiledPage };
    try {
      const win = new Window({
        url: `${url.protocol}//${url.host}${originalUrl}`,
        // https://github.com/capricorn86/happy-dom/tree/master/packages/happy-dom#settings
        settings: {
          disableJavaScriptFileLoading: true,
          disableJavaScriptEvaluation: false,
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

      const outdoc = win.document;
      outdoc.write(compiledPage.output);

      const runtimeScript = outdoc.createElement('script');
      runtimeScript.id = RUNTIME_SCRIPT_ID;
      runtimeScript.appendChild(outdoc.createTextNode(this.clientJs));
      outdoc.body.appendChild(runtimeScript);
      outdoc.body.appendChild(outdoc.createTextNode('\n'));

      let tmp: Window | null = win;
      await Promise.race([
        win.happyDOM.whenAsyncComplete(),
        new Promise<void>(resolve => {
          setTimeout(() => {
            tmp?.happyDOM.cancelAsync();
            resolve();
          }, this.serverPageTimeout);
        })
      ]);
      tmp = null;

      await new Promise(resolve => setTimeout(resolve, 0));
      if (url.searchParams.has(SERVER_NOCLIENT_PARAM)) {
        // if we remove the runtime script without clearing its content first
        // it's executed again -- clearly a happy-dom bug
        runtimeScript.removeChild(runtimeScript.firstChild);
        runtimeScript.remove();
        outdoc.getElementById(PROPS_SCRIPT_ID).remove();
      }

      if (liveSocketsPort) {
        const reloadScript = outdoc.createElement('script');
        reloadScript.id = LIVERELOAD_SCRIPT_ID;
        reloadScript.appendChild(outdoc.createTextNode(`\n` +
        `  if (window.WebSocket) {\n` +
        `    const ws = new WebSocket('ws://${url.hostname}:${liveSocketsPort}');\n` +
        `    ws.onmessage = (event) => {\n` +
        `      if (event.data === 'reload') {\n` +
        `        location.reload();\n` +
        `      }\n` +
        `    }\n` +
        `    setInterval(() => ws.send('keepalive'), 5000);\n` +
        `  }\n`));
        outdoc.body.appendChild(reloadScript);
        outdoc.body.appendChild(outdoc.createTextNode('\n'));
      }

      ret.output = `<!DOCTYPE html>\n` + outdoc.documentElement.outerHTML;
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
  output: string,
  errors?: PageError[]
}

type ExecutedPage = {
  compiledPage: CompiledPage,
  output?: string,
  errors?: PageError[]
}
