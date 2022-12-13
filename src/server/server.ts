import express, { Application, Express } from "express";
import fs from "fs";
import * as http from 'http';
import path from "path";
import Preprocessor, { PreprocessorError } from "../preprocessor/preprocessor";
import exitHook from "./exit-hook";
import { compileDoc, PageError } from "../../src/compiler/page-compiler";
import { HtmlDocument } from "../preprocessor/htmldom";
import { Window } from "happy-dom";
import { Page } from "../runtime/page";
import { StringBuf } from "../preprocessor/util";

export interface ServerProps {
	port?: number,
	rootPath: string,
	assumeHttps?: boolean,
	trustProxy?: boolean,
  init?: (props: ServerProps, app: Application) => void,
	logger?: (type: string, msg: string) => void,
	mute?: boolean,
}

export default class Server {
  props: ServerProps;
	server: http.Server;

  constructor(props: ServerProps, cb?: (port: number) => void) {
    this.props = props;
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
        this.log('info',`${this.getTimestamp()}: START `
          + `http://localhost:${port} [${props.rootPath}]`);
      }
    }

    this.server = props.port
      ? app.listen(props.port, listenCB)
      : app.listen(listenCB);

		exitHook(() => {
			console.log('WILL EXIT');
		});
  }

	async close() {
    return new Promise(resolve => this.server.close(resolve));
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
				res.send(page.html ?? '');
      } catch (err: any) {
				res.header("Content-Type",'text/plain');
				res.send(`${err}`);
				that.log('error', `${that.getTimestamp()}: `
					+ `ERROR ${url.toString()}: ${err}`);
      }
    });
  }

  async getPage(url: URL): Promise<CompiledPage> {
		const filePath = path.normalize(path.join(this.props.rootPath, url.pathname) + '_');
    return this.getFromSources(filePath, url);
  }

  async getFromSources(filePath: string, url: URL): Promise<CompiledPage> {
		const ret: CompiledPage = {};
		try {
			const pre = new Preprocessor(this.props.rootPath);
			const doc = await pre.read(url.pathname) as HtmlDocument;
			if (!doc) {
				throw `failed to load page "${url.pathname}"`;
			}
			const { js, errors } = compileDoc(doc);
			if (errors.length > 0) {
				throw errors;
			}
      const props = eval(`(${js})`);
      const win = new Window({ url: url.toString() });
      win.document.write(doc.toString());
      const root = win.document.documentElement as unknown as Element;
      const page = new Page(win, root, props);
			page.refresh();
			ret.html = doc.toString();
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
	html?: string,
	errors?: PageError[]
}

/**
 * CachedPage
 */
class CachedPage {
	tstamp: number;
	sources: string[];

	constructor(tstamp: number, sources: Array<string>) {
		this.tstamp = tstamp;
		this.sources = sources;
		while (this.sources.length > 0) {
			if (this.sources[this.sources.length - 1] === 'embedded') {
				this.sources.pop();
			} else {
				break;
			}
		}
	}

	//TODO: no two actual checks within the same second
	async isUpToDate(): Promise<boolean> {
    let ret = true;

    for (const source of this.sources) {
      try {
        const stat = await fs.promises.stat(source);
        if (stat.mtime.valueOf() > this.tstamp) {
          throw '';
        }
      } catch (err: any) {
        ret = false;
        break;
      }
    }

    return ret;
	}
}
